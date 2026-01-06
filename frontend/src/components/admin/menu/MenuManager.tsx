import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation, MenuItem } from '@/hooks/ui/useNavigation';
import { ChevronRight, ChevronDown, Plus, Edit, Trash, Folder, File } from 'lucide-react';

// Extended MenuItem interface to include children for the tree view
interface MenuItemWithChildren extends MenuItem {
    children: MenuItemWithChildren[];
}

export default function MenuManager() {
    const { getMenus, createMenu, updateMenu, deleteMenu } = useNavigation();
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMenu, setCurrentMenu] = useState<Partial<MenuItem>>({});
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadMenus();
    }, []);

    const loadMenus = async () => {
        try {
            setLoading(true);
            const data = await getMenus();
            setMenus(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load menus');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (currentMenu.id) {
                await updateMenu(currentMenu.id, currentMenu);
            } else {
                await createMenu(currentMenu);
            }
            setIsEditing(false);
            setCurrentMenu({});
            loadMenus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save menu');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this menu?')) {
            try {
                await deleteMenu(id);
                loadMenus();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete menu');
            }
        }
    };

    const handleEdit = (menu: MenuItem) => {
        setCurrentMenu(menu);
        setIsEditing(true);
    };

    const handleCreate = (parentId?: number) => {
        setCurrentMenu({
            order: 0,
            is_active: true,
            source_type: 'static',
            parent_id: parentId
        });
        setIsEditing(true);
    };

    const toggleExpand = (id: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    // Build tree structure from flat list
    const menuTree = useMemo(() => {
        const menuMap = new Map<number, MenuItemWithChildren>();
        const roots: MenuItemWithChildren[] = [];

        // Initialize map
        menus.forEach(menu => {
            menuMap.set(menu.id, { ...menu, children: [] });
        });

        // Build hierarchy
        menus.forEach(menu => {
            const node = menuMap.get(menu.id);
            if (node) {
                if (menu.parent_id && menuMap.has(menu.parent_id)) {
                    const parent = menuMap.get(menu.parent_id);
                    parent?.children.push(node);
                } else {
                    roots.push(node);
                }
            }
        });

        // Sort by order
        const sortNodes = (nodes: MenuItemWithChildren[]) => {
            nodes.sort((a, b) => a.order - b.order);
            nodes.forEach(node => sortNodes(node.children));
        };
        sortNodes(roots);

        return roots;
    }, [menus]);

    interface MenuTreeItemProps {
        item: MenuItemWithChildren;
        level: number;
    }

    const MenuTreeItem = ({ item, level }: MenuTreeItemProps) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(item.id);

        return (
            <div className="select-none">
                <div
                    className={`flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${!item.is_active ? 'opacity-60' : ''}`}
                    style={{ paddingLeft: `${level * 24 + 12}px` }}
                >
                    <div
                        className="mr-2 cursor-pointer p-1 rounded hover:bg-gray-200"
                        onClick={() => toggleExpand(item.id)}
                        style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                    >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    <div className="mr-3 text-gray-500">
                        {hasChildren ? <Folder size={18} /> : <File size={18} />}
                    </div>

                    <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                            {item.name}
                            {!item.is_active && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Inactive</span>}
                        </div>
                        <div className="text-xs text-gray-400 flex gap-3 mt-0.5">
                            <span>Path: {item.path || '-'}</span>
                            <span>Order: {item.order}</span>
                            <span>ID: {item.id}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleCreate(item.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Add Submenu"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                        >
                            <Trash size={16} />
                        </button>
                    </div>
                </div>

                {isExpanded && hasChildren && (
                    <div>
                        {item.children.map((child: MenuItemWithChildren) => (
                            <MenuTreeItem key={child.id} item={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading menus...</div>;
    if (error) return <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">{error}</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Menu Management</h2>
                    <p className="text-gray-500 text-sm mt-1">Manage your application's navigation structure</p>
                </div>
                <button
                    onClick={() => handleCreate()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Add Root Menu
                </button>
            </div>

            <div className="flex gap-6">
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-500 flex">
                        <div className="w-8"></div>
                        <div className="w-8"></div>
                        <div className="flex-1">Menu Item</div>
                        <div className="w-24 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-gray-100 group">
                        {menuTree.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                No menu items found. Create one to get started.
                            </div>
                        ) : (
                            menuTree.map(item => (
                                <MenuTreeItem key={item.id} item={item} level={0} />
                            ))
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-6 h-fit sticky top-6">
                        <h3 className="text-lg font-bold mb-4 pb-2 border-b">{currentMenu.id ? 'Edit Menu' : 'New Menu'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={currentMenu.name || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMenu({ ...currentMenu, name: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Menu Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                                <input
                                    type="text"
                                    value={currentMenu.path || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMenu({ ...currentMenu, path: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="/path/to/page"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                <input
                                    type="text"
                                    value={currentMenu.icon || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMenu({ ...currentMenu, icon: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Icon Name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent ID</label>
                                    <input
                                        type="number"
                                        value={currentMenu.parent_id || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMenu({ ...currentMenu, parent_id: parseInt(e.target.value) || undefined })}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Root"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                    <input
                                        type="number"
                                        value={currentMenu.order || 0}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMenu({ ...currentMenu, order: parseInt(e.target.value) })}
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                                <select
                                    value={currentMenu.source_type || 'static'}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentMenu({ ...currentMenu, source_type: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="static">Static</option>
                                    <option value="dynamic">Dynamic</option>
                                </select>
                            </div>
                            <div className="flex items-center pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={currentMenu.is_active ?? true}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMenu({ ...currentMenu, is_active: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
