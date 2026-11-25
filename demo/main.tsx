import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BountyFormModal } from "@yabemarket/sdk/react";
import type { CreateBountyInput } from "@yabemarket/sdk";
import "./styles.css";

const DEFAULT_MODAL_TITLE = "Post A Bounty on Yabe";
const DEFAULT_MODAL_DESCRIPTION = "Submit a bounty on Yabe and activate Yabe's hunter network to find it for you.";

const DEFAULT_BOUNTY: Partial<CreateBountyInput> = {
  title: "Looking for a centered Mantle rookie",
  card_name: "Mickey Mantle #311",
  card_maker: "Topps",
  year: 1952,
  bounty_amount: 25000,
  description: "Seeking a clean, well-centered copy. Please share clear front and back photos.",
  graded: true,
  grade: "PSA 3 or better",
  top_category: "Cards",
  category: "Baseball",
};

const amountFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function BountyFormDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [modalTitle, setModalTitle] = useState(DEFAULT_MODAL_TITLE);
  const [modalDescription, setModalDescription] = useState(DEFAULT_MODAL_DESCRIPTION);
  const [bounty, setBounty] = useState<Partial<CreateBountyInput>>(DEFAULT_BOUNTY);

  function updateBountyText(field: "title" | "card_name" | "card_maker" | "category" | "grade", value: string) {
    setBounty((current) => ({ ...current, [field]: value }));
  }

  function updateBountyNumber(field: "year" | "bounty_amount", value: string) {
    setBounty((current) => ({ ...current, [field]: value === "" ? undefined : Number(value) }));
  }

  function resetOptions() {
    setModalTitle(DEFAULT_MODAL_TITLE);
    setModalDescription(DEFAULT_MODAL_DESCRIPTION);
    setBounty(DEFAULT_BOUNTY);
  }

  return (
    <div className="demo-shell">
      <header className="demo-header">
        <a className="demo-brand" href="#home" aria-label="Yabe Partner SDK demo">
          <span className="demo-brand-mark" aria-hidden="true">Y</span>
          <span>YABE <small>PARTNER SDK</small></span>
        </a>
        <span className="demo-header-label">FORM PREVIEW</span>
      </header>

      <main id="home" className="demo-page">
        <div className="demo-heading">
          <p className="demo-eyebrow">PARTNER TOOLS <span>/</span> BOUNTY FORM</p>
          <h1>Customize your bounty form</h1>
        </div>

        <div className="demo-workspace">
          <section className="options-panel" aria-labelledby="options-heading">
            <header className="options-heading">
              <button
                type="button"
                className="options-toggle"
                aria-expanded={optionsOpen}
                aria-controls="bounty-options"
                onClick={() => setOptionsOpen((open) => !open)}
              >
                <span>
                  <span className="demo-eyebrow">SETTINGS</span>
                  <span id="options-heading" className="options-title">Options</span>
                </span>
                <span className={`options-chevron${optionsOpen ? " is-open" : ""}`} aria-hidden="true">⌄</span>
              </button>
              <button type="button" className="reset-button" onClick={resetOptions}>Reset</button>
            </header>

            {optionsOpen && (
              <div id="bounty-options" className="options-content">
                <fieldset className="settings-group">
                  <legend>Modal content</legend>
                  <label className="settings-field">
                    Modal title
                    <input value={modalTitle} onChange={(event) => setModalTitle(event.target.value)} />
                  </label>
                  <label className="settings-field">
                    Description
                    <textarea rows={3} value={modalDescription} onChange={(event) => setModalDescription(event.target.value)} />
                  </label>
                </fieldset>

                <fieldset className="settings-group">
                  <legend>Prefilled bounty</legend>
                  <label className="settings-field">
                    Title
                    <input value={bounty.title ?? ""} onChange={(event) => updateBountyText("title", event.target.value)} />
                  </label>
                  <label className="settings-field">
                    Name
                    <input value={bounty.card_name ?? ""} onChange={(event) => updateBountyText("card_name", event.target.value)} />
                  </label>
                  <div className="settings-row">
                    <label className="settings-field">
                      Maker
                      <input value={bounty.card_maker ?? ""} onChange={(event) => updateBountyText("card_maker", event.target.value)} />
                    </label>
                    <label className="settings-field">
                      Year
                      <input type="number" value={bounty.year ?? ""} onChange={(event) => updateBountyNumber("year", event.target.value)} />
                    </label>
                  </div>
                  <div className="settings-row">
                    <label className="settings-field">
                      Bounty amount (USD)
                      <input type="number" min={0} step={1} value={bounty.bounty_amount ?? ""} onChange={(event) => updateBountyNumber("bounty_amount", event.target.value)} />
                    </label>
                    <label className="settings-field">
                      Sport/Category
                      <input value={bounty.category ?? ""} onChange={(event) => updateBountyText("category", event.target.value)} />
                    </label>
                  </div>
                  <label className="graded-setting">
                    <input type="checkbox" checked={bounty.graded ?? false} onChange={(event) => setBounty((current) => ({ ...current, graded: event.target.checked }))} />
                    Graded
                  </label>
                  {bounty.graded && (
                    <label className="settings-field">
                      Grade
                      <input value={bounty.grade ?? ""} onChange={(event) => updateBountyText("grade", event.target.value)} />
                    </label>
                  )}
                </fieldset>
              </div>
            )}
          </section>

          <section className="preview-panel" aria-labelledby="preview-heading">
            <header className="preview-heading">
              <div>
                <p className="demo-eyebrow">LIVE PREVIEW</p>
                <h2 id="preview-heading">Collector view</h2>
              </div>
              <button className="preview-button" type="button" onClick={() => setModalOpen(true)}>Open form</button>
            </header>
            <div className="preview-stage">
              <article className="preview-modal-card" aria-label="Bounty modal preview">
                <div className="preview-modal-heading">
                  <div>
                    <h3>{modalTitle || DEFAULT_MODAL_TITLE}</h3>
                    <p>{modalDescription || DEFAULT_MODAL_DESCRIPTION}</p>
                  </div>
                  <span className="preview-close" aria-hidden="true">×</span>
                </div>
                <div className="preview-fields">
                  <div><span>Title</span><strong>{bounty.title || "Bounty title"}</strong></div>
                  <div><span>Name</span><strong>{bounty.card_name || "Card or item name"}</strong></div>
                  <div className="preview-amount"><span>Bounty amount</span><strong>{amountFormatter.format(bounty.bounty_amount ?? 0)}</strong></div>
                  <div className="preview-photo"><span>Photo attachments</span><span className="preview-add" aria-hidden="true">+</span></div>
                </div>
                <button className="preview-submit" type="button" onClick={() => setModalOpen(true)}>Submit bounty</button>
              </article>
            </div>
            <p className="preview-note">Changes update the form preview immediately.</p>
          </section>
        </div>
      </main>

      <BountyFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalTitle || DEFAULT_MODAL_TITLE}
        description={modalDescription || DEFAULT_MODAL_DESCRIPTION}
        partnerUserRef="collector-2048"
        initialValues={bounty}
        onSubmit={async () => {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
          return { bounty: { status: "pending" } };
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<BountyFormDemo />);