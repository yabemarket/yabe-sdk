import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CreateBountyInput } from "./types.js";

const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatBountyAmount(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

export interface BountyFormProps {
  onSubmit: (input: CreateBountyInput, attachments: File[]) => void | Promise<unknown>;
  partnerUserRef?: string;
  initialValues?: Partial<CreateBountyInput>;
  onSuccess?: (result: unknown) => void;
  className?: string;
}

export interface BountyFormModalProps extends BountyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

type FormValues = {
  title: string;
  card_name: string;
  card_maker: string;
  year: string;
  bounty_amount: string;
  finders_fee: string;
  description: string;
  graded: boolean;
  grade: string;
  top_category: "Cards" | "Collectibles";
  category: string;
  sub_category: string;
};

type ImageAttachment = { file: File; previewUrl: string };

export function BountyForm({ onSubmit, partnerUserRef, initialValues, onSuccess, className }: BountyFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
  const [values, setValues] = useState<FormValues>(() => ({
    title: initialValues?.title ?? "",
    card_name: initialValues?.card_name ?? "",
    card_maker: initialValues?.card_maker ?? "",
    year: initialValues?.year === undefined ? "" : String(initialValues.year),
    bounty_amount: initialValues?.bounty_amount === undefined ? "" : formatBountyAmount(String(initialValues.bounty_amount)),
    finders_fee: initialValues?.finders_fee == null ? "" : formatBountyAmount(String(initialValues.finders_fee)),
    description: initialValues?.description ?? "",
    graded: initialValues?.graded ?? false,
    grade: initialValues?.grade ?? "",
    top_category: initialValues?.top_category ?? "Cards",
    category: initialValues?.category ?? "",
    sub_category: initialValues?.sub_category ?? "",
  }));
  const [existingImages, setExistingImages] = useState<string[]>(initialValues?.images ?? []);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current.clear();
  }, []);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrorMessage("");
    setSuccess(false);
  }

  function addAttachments(fileList: FileList | null) {
    if (!fileList) return;
    const accepted: ImageAttachment[] = [];
    let totalBytes = attachments.reduce((total, attachment) => total + attachment.file.size, 0);
    let validationMessage = "";

    for (const file of Array.from(fileList)) {
      if (existingImages.length + attachments.length + accepted.length >= MAX_IMAGE_COUNT) {
        validationMessage = `Choose no more than ${MAX_IMAGE_COUNT} images.`;
        break;
      }
      if (!IMAGE_TYPES.has(file.type)) {
        validationMessage = "Choose JPG, PNG, or WebP images.";
        continue;
      }
      if (file.size > MAX_IMAGE_FILE_BYTES) {
        validationMessage = `${file.name} is larger than 10 MB.`;
        continue;
      }
      if (totalBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
        validationMessage = "Combined image attachments cannot exceed 25 MB.";
        continue;
      }

      totalBytes += file.size;
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      accepted.push({ file, previewUrl });
    }

    if (accepted.length > 0) setAttachments((current) => [...current, ...accepted]);
    setErrorMessage(validationMessage);
    setSuccess(false);
  }

  function removeAttachment(index: number) {
    const attachment = attachments[index];
    if (!attachment) return;
    URL.revokeObjectURL(attachment.previewUrl);
    previewUrls.current.delete(attachment.previewUrl);
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function removeExistingImage(index: number) {
    setExistingImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccess(false);

    if (existingImages.length + attachments.length > MAX_IMAGE_COUNT) {
      setErrorMessage(`Choose no more than ${MAX_IMAGE_COUNT} images.`);
      return;
    }

    const userReference = partnerUserRef?.trim() || initialValues?.partner_user_ref?.trim() || "";
    if (!userReference) {
      setErrorMessage("A partner user reference is required to submit this bounty.");
      return;
    }

    const bountyAmount = Number(values.bounty_amount.replace(/,/g, ""));
    if (!Number.isInteger(bountyAmount) || bountyAmount < 0 || bountyAmount > 100000000) {
      setErrorMessage("Enter a whole-dollar bounty amount between $0 and $100,000,000.");
      return;
    }

    const findersFee = values.finders_fee === "" ? undefined : Number(values.finders_fee.replace(/,/g, ""));
    if (findersFee !== undefined && (!Number.isInteger(findersFee) || findersFee < 0 || findersFee > 100000000)) {
      setErrorMessage("Enter a whole-dollar Finder's Reward between $0 and $100,000,000.");
      return;
    }

    setSubmitting(true);

    const input: CreateBountyInput = {
      partner_user_ref: userReference,
      title: values.title.trim(),
      card_name: values.card_name.trim(),
      card_maker: values.card_maker.trim(),
      year: Number(values.year),
      bounty_amount: bountyAmount,
      ...(findersFee === undefined ? {} : { finders_fee: findersFee }),
      description: values.description.trim(),
      graded: values.graded,
      ...(values.graded && values.grade.trim() ? { grade: values.grade.trim() } : {}),
      top_category: values.top_category,
      ...(values.category.trim() ? { category: values.category.trim() } : {}),
      ...(values.sub_category.trim() ? { sub_category: values.sub_category.trim() } : {}),
      images: existingImages,
    };

    try {
      const result = await onSubmit(input, attachments.map((attachment) => attachment.file));
      setSuccess(true);
      onSuccess?.(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message.slice(0, 300) : "Could not submit bounty.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <label>
        Title
        <input required maxLength={200} value={values.title} onChange={(event) => update("title", event.target.value)} />
      </label>
      <label>
        Name
        <input required maxLength={200} value={values.card_name} onChange={(event) => update("card_name", event.target.value)} />
      </label>
      <label>
        Maker
        <input required maxLength={120} value={values.card_maker} onChange={(event) => update("card_maker", event.target.value)} />
      </label>
      <label>
        Year
        <input required type="number" min={1800} max={2100} step={1} value={values.year} onChange={(event) => update("year", event.target.value)} />
      </label>
      <label>
        Bounty amount (USD)
        <span className="yabe-currency-input">
          <input
            aria-label="Bounty amount (USD)"
            required
            type="text"
            inputMode="numeric"
            pattern="[0-9,]*"
            maxLength={11}
            value={values.bounty_amount}
            onFocus={(event) => update("bounty_amount", event.currentTarget.value.replace(/,/g, ""))}
            onChange={(event) => update("bounty_amount", event.target.value.replace(/\D/g, ""))}
            onBlur={(event) => update("bounty_amount", formatBountyAmount(event.currentTarget.value))}
          />
        </span>
      </label>
      <label>
        Finder's Reward (USD)
        <span className="yabe-currency-input">
          <input
            aria-label="Finder's Reward (USD)"
            type="text"
            inputMode="numeric"
            pattern="[0-9,]*"
            maxLength={11}
            value={values.finders_fee}
            onFocus={(event) => update("finders_fee", event.currentTarget.value.replace(/,/g, ""))}
            onChange={(event) => update("finders_fee", event.target.value.replace(/\D/g, ""))}
            onBlur={(event) => update("finders_fee", formatBountyAmount(event.currentTarget.value))}
          />
        </span>
      </label>
      <label>
        Sport/Category
        <input maxLength={100} value={values.category} onChange={(event) => update("category", event.target.value)} />
      </label>
      <label>
        <input type="checkbox" checked={values.graded} onChange={(event) => update("graded", event.target.checked)} />
        Graded
      </label>
      <label>
        Grade
        <input maxLength={50} disabled={!values.graded} value={values.grade} onChange={(event) => update("grade", event.target.value)} />
      </label>
      <label className="yabe-bounty-description-field">
        Description
        <textarea required maxLength={5000} value={values.description} onChange={(event) => update("description", event.target.value)} />
      </label>
      <fieldset className="yabe-image-field" aria-describedby="yabe-image-help">
        <legend>Photo attachments <span>Optional</span></legend>
        <div className="yabe-image-grid">
          {existingImages.map((url, index) => (
            <figure className="yabe-image-preview" key={`${url}-${index}`}>
              <img src={url} alt={`Existing bounty photo ${index + 1}`} />
              <button type="button" aria-label={`Remove existing photo ${index + 1}`} onClick={() => removeExistingImage(index)}>×</button>
            </figure>
          ))}
          {attachments.map((attachment, index) => (
            <figure className="yabe-image-preview" key={attachment.previewUrl}>
              <img src={attachment.previewUrl} alt={attachment.file.name} />
              <button type="button" aria-label={`Remove attached photo ${index + 1}`} onClick={() => removeAttachment(index)}>×</button>
            </figure>
          ))}
          {existingImages.length + attachments.length < MAX_IMAGE_COUNT && (
            <button type="button" className="yabe-image-add" onClick={() => fileInputRef.current?.click()}>
              <span aria-hidden="true">+</span>
              Add photos
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          aria-label="Choose image files"
          onChange={(event) => {
            addAttachments(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <small id="yabe-image-help">JPG, PNG, or WebP. Up to 10 images, 10 MB each and 25 MB total.</small>
      </fieldset>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {success && <p role="status">Bounty submitted for Yabe review.</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit bounty"}
      </button>
    </form>
  );
}

const MODAL_STYLES = `
.yabe-bounty-overlay{position:fixed;inset:0;z-index:50;background:rgb(0 0 0 / 50%)}
.yabe-bounty-dialog{position:fixed;top:50%;left:50%;z-index:51;width:min(640px,calc(100vw - 32px));max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;transform:translate(-50%,-50%);border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;box-shadow:0 8px 24px rgb(0 0 0 / 16%);font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}
.yabe-bounty-dialog,.yabe-bounty-dialog *,.yabe-bounty-dialog *::before,.yabe-bounty-dialog *::after{box-sizing:border-box}
.yabe-bounty-modal-body{padding:24px}
.yabe-bounty-modal-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb}
.yabe-bounty-modal-title{margin:0;font-size:22px;line-height:1.3;font-weight:600}
.yabe-bounty-modal-description{margin:6px 0 0;color:#4b5563;font-size:14px}
.yabe-bounty-close{display:grid;flex:0 0 auto;width:32px;height:32px;place-items:center;border:0;border-radius:4px;background:transparent;color:#4b5563;font:24px/1 system-ui,sans-serif;cursor:pointer}
.yabe-bounty-close:hover{background:#f3f4f6;color:#111827}
.yabe-bounty-close:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.yabe-bounty-form{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.yabe-bounty-form>label{display:grid;width:100%;min-width:0;align-content:start;gap:5px;color:#374151;font-size:13px;font-weight:500}
.yabe-bounty-form>label:has(input[type=checkbox]){display:flex;align-items:center;min-height:38px;gap:8px}
.yabe-bounty-description-field{grid-column:1/-1}
.yabe-bounty-form input:not([type=checkbox]),.yabe-bounty-form select,.yabe-bounty-form textarea{width:100%;min-width:0;min-height:40px;border:1px solid #9ca3af;border-radius:4px;background:#fff;color:#111827;padding:8px 10px;font:14px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.yabe-bounty-form input:not([type=checkbox]),.yabe-bounty-form select{height:40px}
.yabe-currency-input{display:flex;align-items:center;width:100%;height:40px;border:1px solid #9ca3af;border-radius:4px;background:#fff;padding-left:10px;color:#4b5563}
.yabe-currency-input::before{content:"$"}
.yabe-currency-input:focus-within{border-color:#2563eb;outline:2px solid rgb(37 99 235 / 20%)}
.yabe-currency-input input{height:38px!important;min-height:38px!important;border:0!important;outline:0!important;box-shadow:none!important}
.yabe-bounty-form input:focus,.yabe-bounty-form select:focus,.yabe-bounty-form textarea:focus{border-color:#2563eb;outline:2px solid rgb(37 99 235 / 20%)}
.yabe-bounty-form textarea{height:auto;min-height:96px;resize:vertical;line-height:1.5}
.yabe-bounty-form input:disabled{background:#f3f4f6;color:#6b7280}
.yabe-bounty-form input[type=checkbox]{width:16px;height:16px}
.yabe-image-field{grid-column:1/-1;min-width:0;margin:0;padding:12px;border:1px solid #d1d5db;border-radius:4px}
.yabe-image-field legend{padding:0 5px;color:#374151;font-size:13px;font-weight:500}
.yabe-image-field legend span{margin-left:6px;color:#6b7280;font-size:12px;font-weight:400}
.yabe-image-grid{display:flex;flex-wrap:wrap;gap:8px}
.yabe-image-preview{position:relative;width:64px;height:72px;margin:0;overflow:hidden;border:1px solid #d1d5db;border-radius:4px;background:#f3f4f6}
.yabe-image-preview img{width:100%;height:100%;object-fit:cover}
.yabe-image-preview button{position:absolute;top:3px;right:3px;width:20px;height:20px;border:1px solid #d1d5db;border-radius:3px;background:#fff;color:#111827;font-size:16px;line-height:16px}
.yabe-image-add{display:grid;width:84px;height:72px;place-content:center;gap:3px;border:1px dashed #9ca3af;border-radius:4px;background:#fff;color:#374151;font:12px system-ui,sans-serif}
.yabe-image-add span{font-size:20px;line-height:1}
.yabe-image-field small{display:block;margin-top:8px;color:#6b7280;font-size:12px}
.yabe-bounty-form>[role=alert],.yabe-bounty-form>[role=status],.yabe-bounty-form>button{grid-column:1/-1}
.yabe-bounty-form>[role=alert]{margin:0;padding:9px 11px;border:1px solid #fca5a5;border-radius:4px;background:#fef2f2;color:#991b1b;font-size:13px}
.yabe-bounty-form>[role=status]{margin:0;padding:9px 11px;border:1px solid #86efac;border-radius:4px;background:#f0fdf4;color:#166534;font-size:13px}
.yabe-bounty-form>button[type=submit]{min-height:40px;border:1px solid #1f2937;border-radius:4px;background:#1f2937;color:#fff;font:500 14px system-ui,sans-serif}
.yabe-bounty-form>button[type=submit]:hover:not(:disabled){background:#374151}
.yabe-bounty-form>button[type=submit]:disabled{cursor:wait;opacity:.65}
@media(max-width:560px){
  .yabe-bounty-dialog{top:auto;bottom:0;left:0;width:100%;max-height:90dvh;transform:none;border-radius:8px 8px 0 0}
  .yabe-bounty-modal-body{padding:20px 16px calc(20px + env(safe-area-inset-bottom))}
  .yabe-bounty-modal-title{font-size:20px}
  .yabe-bounty-form{gap:14px}
  .yabe-bounty-description-field,.yabe-image-field,.yabe-bounty-form>[role=alert],.yabe-bounty-form>[role=status],.yabe-bounty-form>button{grid-column:1}
}
`;

export function BountyFormModal({
  open,
  onOpenChange,
  title = "Post A Bounty on Yabe",
  description = "Submit a bounty on Yabe and activate Yabe's hunter network to find it for you.",
  className,
  ...formProps
}: BountyFormModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <style>{MODAL_STYLES}</style>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="yabe-bounty-overlay" />
        <DialogPrimitive.Content className="yabe-bounty-dialog" aria-modal="true">
          <div className="yabe-bounty-modal-body">
            <header className="yabe-bounty-modal-heading">
              <div>
                <DialogPrimitive.Title className="yabe-bounty-modal-title">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="yabe-bounty-modal-description">{description}</DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="yabe-bounty-close" aria-label="Close">×</DialogPrimitive.Close>
            </header>
            <BountyForm {...formProps} className={`yabe-bounty-form ${className ?? ""}`.trim()} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}