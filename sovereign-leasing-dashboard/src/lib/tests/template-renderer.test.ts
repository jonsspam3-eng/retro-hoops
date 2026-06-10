import test from "node:test";
import assert from "node:assert/strict";
import { renderTemplate } from "@/lib/template-renderer";

test("renders known merge variables", () => {
  const output = renderTemplate("Hi {{client_name}}, listing {{listing_address}} {{apartment_number}}", {
    client_name: "Taylor",
    listing_address: "101 Warren St",
    apartment_number: "2A",
  });

  assert.equal(output, "Hi Taylor, listing 101 Warren St 2A");
});
