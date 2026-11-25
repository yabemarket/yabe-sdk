# @yabemarket/sdk

Typed JavaScript client and optional React bounty form for the Yabe Partner API. See the [Partner API reference](https://docs.yabemarket.com/) for the complete endpoint contract and cURL examples.

## Install

```sh
npm install @yabemarket/sdk
```

The API client has no runtime dependencies and uses the runtime's built-in `fetch`. The React form is optional and requires React 18 or newer.

## API client

Use the API client only in a server-side environment. Keep your partner key in a server-only environment variable; never include it in a browser bundle or send it to a user's device. The client sends the key as a bearer token to `https://api.yabemarket.com`.

```ts
import { YabeClient } from "@yabemarket/sdk";

const yabe = new YabeClient({ apiKey: process.env.YABE_API_KEY! });

const result = await yabe.createBounty({
  partner_user_ref: "customer-42",
  title: "1952 Topps Mickey Mantle #311",
  card_name: "Mickey Mantle",
  card_maker: "Topps",
  year: 1952,
  bounty_amount: 25000,
  finders_fee: 500,
  description: "Looking for a centered copy, PSA 3 or better.",
  graded: true,
  grade: "PSA 3",
});
```

The client calls the Yabe Partner API directly from your server:

- `createBounty(input)` sends `POST https://api.yabemarket.com/create-bounty`.
- `listBounties({ status, partner_user_ref, limit, offset })` sends `GET https://api.yabemarket.com/get-partner-bounties` and returns your partner's bounties, newest first. The API supports statuses `pending`, `active`, `completed`, `closed`, and `removed`; `limit` defaults to 50 and is capped at 100.
- `cancelBounty(bountyId)` sends `POST https://api.yabemarket.com/cancel-bounty` to remove a pending or active bounty when given its UUID.

Non-success responses throw `YabeApiError`, which includes the HTTP `status`, optional `code`, and optional validation `details`. New bounties start as `pending` and go live after Yabe review.

`finders_fee` is optional and sets the Finder's Reward in whole US dollars, from 0 to 100,000,000. Omit it when no reward is offered. Created and listed bounty responses include `finders_fee` as a number or `null`.

The current create and list responses do not include a bounty UUID, but cancellation requires one. As a result, `cancelBounty` cannot be used for a bounty created solely through these API responses until the API exposes that ID. See the [Partner API reference](https://docs.yabemarket.com/) for current response examples and error codes.

## React bounty form

Import `BountyFormModal` from `@yabemarket/sdk/react`. It uses Radix Dialog for accessible modal behavior and follows Yabe's cream, ink-outline, hard-shadow style: a centered dialog on desktop and a slide-up sheet on mobile. It collects bounty details, including the optional Finder's Reward, and accepts up to 10 image attachments. Pass the signed-in customer identifier as `partnerUserRef`; the form adds it to the submitted bounty without displaying it as an editable field. Its `onSubmit` callback sends the data to a server endpoint in your application. That endpoint calls `YabeClient` with the server-only partner key; the modal never receives the key or calls the partner API itself.

```tsx
import { useState } from "react";
import { BountyFormModal } from "@yabemarket/sdk/react";

export function NewBounty() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Create a bounty</button>
      <BountyFormModal
        open={open}
        onOpenChange={setOpen}
        partnerUserRef="customer-42"
        onSubmit={async (bounty, attachments) => {
          const body = new FormData();
          body.set("bounty", JSON.stringify(bounty));
          for (const file of attachments) body.append("images", file, file.name);
          // This is a route in your application, not a Yabe API endpoint.
          const response = await fetch("/api/yabe/bounties", { method: "POST", body });
          if (!response.ok) throw new Error("Could not submit bounty");
          return response.json();
        }}
      />
    </>
  );
}
```

The example's `/api/yabe/bounties` route belongs to your application. On that server route, read the `bounty` JSON field and `images` file fields from `FormData`, then call `yabe.createBounty(bounty, attachments)`. The SDK sends the `partner_user_ref` alongside the bounty data to Yabe's `POST https://api.yabemarket.com/create-bounty` endpoint, which stores the images and adds their public URLs to the bounty. Keep your partner key on the server. Use `initialValues` to prefill visible fields; `title`, `description`, and `className` customize the modal. For backwards compatibility, `initialValues.partner_user_ref` remains a fallback when `partnerUserRef` is not supplied.

## License

MIT.