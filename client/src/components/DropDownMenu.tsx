import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Ellipsis } from 'lucide-react'

type Item = {
  label: string; 
  onClick: () => void;
}

export const DropdownMenu = ({ items }: { items: Item[] }) => (
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
      {items.map((item) => (
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
