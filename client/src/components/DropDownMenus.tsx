import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Ellipsis } from 'lucide-react'
import { useState } from 'react';

type EllipsisItem = {
  label: string;
  onClick: () => void;
};

type EllipsisProps = {
  items: EllipsisItem[];
};

export type TextProps = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export const DropdownMenuEllipsis: React.FC<EllipsisProps> = ({ items }) => (
  <Menu as="div" className="relative inline-block text-left">
    <MenuButton
      className="
        p-2 rounded-full hover:bg-gray-100
        focus:outline-none focus:ring-0
        cursor-pointer
      "
    >
      <Ellipsis className="h-5 w-5" />
    </MenuButton>

    <MenuItems
      anchor="bottom end"
      className="z-10 mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black/10 focus:outline-none"
    >
      {items.map((item: EllipsisItem) => (
        <MenuItem
          key={item.label}
          as="button"
          onClick={item.onClick}
          className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 focus:outline-none"
        >
          {item.label}
        </MenuItem>
      ))}
    </MenuItems>
  </Menu>
)

export const DropdownMenuText: React.FC<TextProps> = ({ options, selected, onSelect }) => {
  return (
    <Menu as="div" className="relative inline-block text-center">
      <MenuButton className="w-48 p-1 bg-natural-100 border-gray-300 border-2 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-0 cursor-pointer">
        {selected || "Select model"}
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="block border-spacing-0.5 border-gray-300 w-48 rounded-md bg-white shadow-lg ring-1 ring-black/10 focus:outline-none"
      >
        {options.map((option) =>
          <MenuItem
            className={"block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 focus:outline-none"}
            key={option}
            as="button"
            onClick={() => onSelect(option)}
          >
            {option}
          </MenuItem>
        )}
      </MenuItems>

    </Menu>
  );
};

