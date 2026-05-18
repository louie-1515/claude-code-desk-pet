import { DEFAULT_SELECTED_PET_ID } from "./window-state.js";

function normalizePets(pets) {
  return Array.isArray(pets) ? pets.filter(Boolean) : [];
}

// Shared menu template for both tray and window context menu.
// This file intentionally returns plain template objects so tests can run in Node.
export function buildDeskPetMenuTemplate({
  selectedPetId = DEFAULT_SELECTED_PET_ID,
  hideBubbleOnIdle = false,
  pets = [],
  onToggleHideBubbleOnIdle = null,
  onSelectPet = null
} = {}) {
  const safePets = normalizePets(pets);
  const currentPetId =
    typeof selectedPetId === "string" && selectedPetId.trim()
      ? selectedPetId
      : DEFAULT_SELECTED_PET_ID;

  const toggleItem = {
    label: "待机时隐藏气泡",
    type: "checkbox",
    checked: hideBubbleOnIdle === true,
    click: () => {
      if (typeof onToggleHideBubbleOnIdle === "function") {
        onToggleHideBubbleOnIdle(!(hideBubbleOnIdle === true));
      }
    }
  };

  const switchPetSubmenu = safePets.map(pet => {
    const id = pet?.id;
    const label = pet?.displayName ?? pet?.name ?? String(id);
    return {
      label,
      type: "radio",
      checked: id === currentPetId,
      click: () => {
        if (typeof onSelectPet === "function" && typeof id === "string") {
          onSelectPet(id);
        }
      }
    };
  });

  return [
    toggleItem,
    { type: "separator" },
    {
      label: "切换形象",
      submenu: switchPetSubmenu
    }
  ];
}

