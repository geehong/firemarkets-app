import React, { useState, useEffect } from 'react';
import { useNavigation, MenuItem } from '@/hooks/useNavigation';

export default function MenuManager() {
    const { getMenus, createMenu, updateMenu, deleteMenu } = useNavigation();
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMenu, setCurrentMenu] = useState<Partial<MenuItem>>({});

    useEffect(() => {
        loadMenus();
    }, []);

    const loadMenus = async () => {
        try {
            setLoading(true);
            const data = await getMenus();
            setMenus(data);
        } catch (err: any) {
            setError(err.message);
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
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this menu?')) {
            try {
                await deleteMenu(id);
                loadMenus();
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    const handleEdit = (menu: MenuItem) => {
        setCurrentMenu(menu);
        setIsEditing(true);
    };

    const handleCreate = () => {
        setCurrentMenu({
            order: 0,
            is_active: true,
            source_type: 'static'
        });
        setIsEditing(true);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">Menu Management</h2>
                <button
                    onClick={handleCreate}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Add Menu
                </button>
            </div>

            {isEditing && (
                <div className="mb-4 p-4 border rounded bg-gray-50">
                    <h3 className="font-bold mb-2">{currentMenu.id ? 'Edit Menu' : 'New Menu'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                type="text"
                                value={currentMenu.name || ''}
                                onChange={e => setCurrentMenu({ ...currentMenu, name: e.target.value })}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Path</label>
                            <input
                                type="text"
                                value={currentMenu.path || ''}
                                onChange={e => setCurrentMenu({ ...currentMenu, path: e.target.value })}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Icon</label>
                            <input
                                type="text"
                                value={currentMenu.icon || ''}
                                onChange={e => setCurrentMenu({ ...currentMenu, icon: e.target.value })}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Parent ID</label>
                            <input
                                type="number"
                                value={currentMenu.parent_id || ''}
                                onChange={e => setCurrentMenu({ ...currentMenu, parent_id: parseInt(e.target.value) || undefined })}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Order</label>
                            <input
                                type="number"
                                value={currentMenu.order || 0}
                                onChange={e => setCurrentMenu({ ...currentMenu, order: parseInt(e.target.value) })}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Source Type</label>
                            <select
                                value={currentMenu.source_type || 'static'}
                                onChange={e => setCurrentMenu({ ...currentMenu, source_type: e.target.value })}
                                className="w-full border p-2 rounded"
                            >
                                <option value="static">Static</option>
                                <option value="dynamic">Dynamic</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={currentMenu.is_active ?? true}
                                onChange={e => setCurrentMenu({ ...currentMenu, is_active: e.target.checked })}
                                className="mr-2"
                            />
                            <label>Is Active</label>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="bg-gray-300 px-4 py-2 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            <table className="min-w-full bg-white border">
                <thead>
                    <tr>
                        <th className="border p-2">ID</th>
                        <th className="border p-2">Name</th>
                        <th className="border p-2">Path</th>
                        <th className="border p-2">Icon</th>
                        <th className="border p-2">Parent</th>
                        <th className="border p-2">Order</th>
                        <th className="border p-2">Active</th>
                        <th className="border p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {menus.map(menu => (
                        <tr key={menu.id}>
                            <td className="border p-2">{menu.id}</td>
                            <td className="border p-2">{menu.name}</td>
                            <td className="border p-2">{menu.path}</td>
                            <td className="border p-2">{menu.icon}</td>
                            <td className="border p-2">{menu.parent_id}</td>
                            <td className="border p-2">{menu.order}</td>
                            <td className="border p-2">{menu.is_active ? 'Yes' : 'No'}</td>
                            <td className="border p-2">
                                <button
                                    onClick={() => handleEdit(menu)}
                                    className="text-blue-500 mr-2"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(menu.id)}
                                    className="text-red-500"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
