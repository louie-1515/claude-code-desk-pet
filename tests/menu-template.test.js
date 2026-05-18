import test from "node:test";
import assert from "node:assert/strict";

import { buildDeskPetMenuTemplate } from "../pet-app/menu-template.js";

test("menu template contains idle bubble checkbox with correct checked state", () => {
  const template = buildDeskPetMenuTemplate({ hideBubbleOnIdle: true, pets: [] });
  assert.equal(template[0].label, "待机时隐藏气泡");
  assert.equal(template[0].type, "checkbox");
  assert.equal(template[0].checked, true);
});

test("menu template contains switch-pet submenu with radio entries and checked current pet", () => {
  const pets = [
    { id: "default", displayName: "默认" },
    { id: "cat", displayName: "猫猫" }
  ];
  const template = buildDeskPetMenuTemplate({ selectedPetId: "cat", pets });
  const switchItem = template.find(item => item?.label === "切换形象");
  assert.ok(switchItem, "should contain 切换形象 menu item");
  assert.ok(Array.isArray(switchItem.submenu), "切换形象 should have submenu array");
  assert.equal(switchItem.submenu.length, 2);
  assert.deepEqual(
    switchItem.submenu.map(item => ({ type: item.type, label: item.label, checked: item.checked })),
    [
      { type: "radio", label: "默认", checked: false },
      { type: "radio", label: "猫猫", checked: true }
    ]
  );
});

