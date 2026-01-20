import classNames from "classnames";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Ellipsis } from "lucide-react";

type EllipsisItem = {
  label: React.ElementType;
  onClick: () => void;
};

type EllipsisProps = {
  items: EllipsisItem[];
};

export type DropdownOption<T = string> = { name: string; value: T };

export type TextProps = {
  options: Array<DropdownOption>;
  disabled: boolean;
  selected: DropdownOption | undefined;
  onSelect: (value?: DropdownOption) => void;
  isSelected: boolean;
  setSelected: (isSelected: boolean) => void;
};

export const DropdownMenuEllipsis: React.FC<EllipsisProps> = ({ items }) => {
  return (
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
        {items.map((item: EllipsisItem, i) => {
          const Label = item.label;
          return (
            <MenuItem
              key={i}
              as="button"
              onClick={item.onClick}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 focus:outline-none cursor-pointer data-disabled:opacity-50"
            >
              <Label />
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
};

export const DropdownMenuText: React.FC<TextProps> = ({
  options,
  disabled,
  selected,
  onSelect,
  isSelected,
  setSelected,
}) => {
  return (
    <Menu as="div" className="w-full relative text-center">
      <MenuButton
        disabled={disabled}
        className={classNames(
          "w-full p-1 bg-natural-100 border border-gray-300 h-10 rounded-lg shadow-sm not-disabled:hover:bg-gray-100 focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed select-none text-sm",
          {
            "border-gray-300": isSelected,
          },
        )}
      >
        {selected?.name || "-"}
      </MenuButton>

      <MenuItems
        anchor="bottom start"
        className="block border-spacing-0.5 border-gray-300 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black/10 focus:outline-none"
      >
        {options.map((option) => (
          <MenuItem
            className={
              "block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 focus:outline-none hover:cursor-pointer"
            }
            key={option.value}
            value={option.value}
            as="button"
            disabled={disabled}
            onClick={() => {
              onSelect(option);
              setSelected(true);
            }}
          >
            {option.name}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};
