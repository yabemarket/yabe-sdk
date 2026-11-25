import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

if (!URL.createObjectURL) {
	Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:test-image" });
}
if (!URL.revokeObjectURL) {
	Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => undefined });
}
if (!HTMLDialogElement.prototype.showModal) {
	HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
}
if (!HTMLDialogElement.prototype.close) {
	HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
}