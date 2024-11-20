import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ItemDetailModal = ({ item, isOpen, onClose, onUpdate }) => {
    const { user } = useAuth();
    const [description, setDescription] = useState(item.description || '');
    const [status, setStatus] = useState(item.status || 'In Progress');
    const [activities, setActivities] = useState(item.activities || []);
    const [newActivity, setNewActivity] = useState('');
    const [currentFile, setCurrentFile] = useState(null);
    const [subtasks, setSubtasks] = useState(item.subtasks || []);
    const [newSubtask, setNewSubtask] = useState('');
    const [progress, setProgress] = useState(0);

    const statusOptions = ['In Progress', 'Done', 'Skipped'];

    useEffect(() => {
        calculateProgress();
    }, [subtasks]);

    const calculateProgress = () => {
        if (subtasks.length === 0) {
            setProgress(0);
            return;
        }
        const completedTasks = subtasks.filter(task => task.completed).length;
        const progressPercentage = Math.round((completedTasks / subtasks.length) * 100);
        setProgress(progressPercentage);
    };

    const handleAddSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks([...subtasks, { text: newSubtask, completed: false }]);
        setNewSubtask('');
    };

    const toggleSubtask = (index) => {
        const updatedSubtasks = subtasks.map((subtask, i) =>
            i === index ? { ...subtask, completed: !subtask.completed } : subtask
        );
        setSubtasks(updatedSubtasks);
    };

    const handleSave = async () => {
        const updatedItem = {
            ...item,
            stage_id: item.stage_id,
            content: item.content,
            description: description,
            status: status,
            progress: progress,
            subtasks: subtasks.map(subtask => ({
                text: subtask.text,
                completed: subtask.completed
            })),
            activities: activities.map(activity => ({
                text: activity.text,
                timestamp: activity.timestamp,
                file: activity.file
            }))
        };

        try {
            const board_id = item.stage_id.split('_').pop();

            const response = await fetch(`http://localhost:8000/boards/${board_id}/items/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedItem),
            });

            if (response.ok) {
                onUpdate(updatedItem);
                onClose();
            } else {
                console.error('Failed to update item:', await response.text());
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleAddActivity = async () => {
        if (!newActivity.trim() && !currentFile) return;

        const formData = new FormData();
        if (currentFile) {
            formData.append('file', currentFile);
        }

        try {
            let fileData = null;
            if (currentFile) {
                const fileResponse = await fetch(`http://localhost:8000/items/${item.id}/files`, {
                    method: 'POST',
                    body: formData,
                });
                if (fileResponse.ok) {
                    fileData = await fileResponse.json();
                }
            }

            const newActivityEntry = {
                text: newActivity,
                timestamp: new Date().toISOString(),
                file: fileData
            };

            setActivities([...activities, newActivityEntry]);
            setNewActivity('');
            setCurrentFile(null);
        } catch (error) {
            console.error('Error adding activity:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-semibold mb-2">{item.content}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Status:</span>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="border rounded-md px-2 py-1 text-sm"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
                        </div>

                        <div className="bg-gray-100 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">Progress (based on subtasks)</span>
                                <span className="text-sm text-gray-600">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Description Section */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 border rounded-md min-h-[100px]"
                                placeholder="Add a detailed description..."
                            />
                        </div>

                        {/* Subtasks Section */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Subtasks</label>
                            <div className="space-y-2 mb-4">
                                {subtasks.map((subtask, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={subtask.completed}
                                            onChange={() => toggleSubtask(index)}
                                            className="rounded border-gray-300"
                                        />
                                        <span className={`${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                                            {subtask.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    placeholder="Add a subtask..."
                                    className="flex-1 p-2 border rounded-md"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Activities Section */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Activities</label>
                            <div className="space-y-4 mb-4">
                                {activities.map((activity, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                                        <p className="text-sm mb-2">{activity.text}</p>
                                        {activity.file && (
                                            <a
                                                href={`http://localhost:8000${activity.file.url}`}
                                                className="text-blue-500 hover:underline text-sm block mb-2"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                📎 {activity.file.name}
                                            </a>
                                        )}
                                        <span className="text-xs text-gray-500">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <textarea
                                    value={newActivity}
                                    onChange={(e) => setNewActivity(e.target.value)}
                                    placeholder="Add an activity..."
                                    className="w-full p-2 border rounded-md"
                                    rows={3}
                                />
                                <input
                                    type="file"
                                    onChange={(e) => setCurrentFile(e.target.files[0])}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                                             file:rounded-md file:border-0 file:text-sm file:font-semibold 
                                             file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <button
                                    onClick={handleAddActivity}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md 
                                             hover:bg-blue-600 w-full"
                                >
                                    Add Activity
                                </button>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal;