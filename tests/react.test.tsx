import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BountyForm, BountyFormModal } from "../src/react.js";

const initialValues = {
  partner_user_ref: "customer-42",
  title: "Find this card",
  card_name: "Mickey Mantle",
  card_maker: "Topps",
  year: 1952,
  bounty_amount: 25000,
  finders_fee: 1250,
  description: "Centered copy preferred",
};

describe("BountyForm", () => {
  it("uses concise field labels and places description before photo attachments", () => {
    const { container } = render(<BountyForm initialValues={initialValues} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Sport/Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Finder's Reward (USD)")).toBeInTheDocument();
    expect(screen.getByLabelText("Graded")).toBeInTheDocument();
    expect(screen.queryByLabelText("Top category")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sub-category")).not.toBeInTheDocument();

    const form = container.querySelector("form");
    const description = form?.querySelector(".yabe-bounty-description-field");
    const photos = form?.querySelector(".yabe-image-field");
    expect(description?.compareDocumentPosition(photos!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("submits typed field values through the callback and confirms pending review", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ bounty: { status: "pending" } });
    render(<BountyForm initialValues={initialValues} onSubmit={onSubmit} />);

    expect(screen.getByLabelText("Bounty amount (USD)")).toHaveValue("25,000");
    expect(screen.getByLabelText("Finder's Reward (USD)")).toHaveValue("1,250");
    expect(screen.queryByLabelText("Your user reference")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      ...initialValues,
      year: 1952,
      bounty_amount: 25000,
      finders_fee: 1250,
      graded: false,
      top_category: "Cards",
      images: [],
    }), []);
    expect(await screen.findByRole("status")).toHaveTextContent("submitted for Yabe review");
  });

  it("attaches the partner user reference supplied as metadata", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ bounty: { status: "pending" } });
    render(<BountyForm partnerUserRef="account-9" onSubmit={onSubmit} initialValues={{ title: "Wanted", card_name: "Card", card_maker: "Topps", year: 1990, bounty_amount: 100, description: "Any copy" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ partner_user_ref: "account-9" }), []));
  });

  it("requires a partner user reference without exposing it as a form field", async () => {
    const onSubmit = vi.fn();
    render(<BountyForm onSubmit={onSubmit} initialValues={{ title: "Wanted", card_name: "Card", card_maker: "Topps", year: 1990, bounty_amount: 100, description: "Any copy" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("partner user reference is required");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Your user reference")).not.toBeInTheDocument();
  });

  it("omits an empty Finder's Reward and validates a provided value", async () => {
    const onSubmit = vi.fn();
    render(<BountyForm initialValues={{ ...initialValues, finders_fee: undefined }} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("finders_fee");

    onSubmit.mockClear();
    fireEvent.change(screen.getByLabelText("Finder's Reward (USD)"), { target: { value: "100000001" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Finder's Reward between $0 and $100,000,000");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows callback errors and prevents duplicate submission while pending", async () => {
    let rejectSubmit: ((error: Error) => void) | undefined;
    const onSubmit = vi.fn(() => new Promise((_, reject) => { rejectSubmit = reject; }));
    render(<BountyForm initialValues={initialValues} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));
    expect(screen.getByRole("button", { name: "Submitting..." })).toBeDisabled();
    rejectSubmit?.(new Error("Partner service unavailable"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Partner service unavailable");
    expect(screen.getByRole("button", { name: "Submit bounty" })).toBeEnabled();
  });

  it("uses native required-field validation", () => {
    const onSubmit = vi.fn();
    render(<BountyForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("passes selected image files to the callback and renders a preview", async () => {
    const onSubmit = vi.fn();
    render(<BountyForm initialValues={initialValues} onSubmit={onSubmit} />);
    const image = new File(["image bytes"], "front.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose image files"), {
      target: { files: [image] },
    });
    expect(screen.getByRole("img", { name: "front.jpg" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit bounty" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining(initialValues), [image]));
  });
});

describe("BountyFormModal", () => {
  it("renders as a controlled modal and reports close requests", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return <BountyFormModal open={open} onOpenChange={setOpen} onSubmit={vi.fn()} />;
    }
    render(<Harness />);

    const dialog = screen.getByRole("dialog", { name: "Post A Bounty on Yabe" });
    expect(dialog).toHaveAttribute("data-state", "open");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });
});