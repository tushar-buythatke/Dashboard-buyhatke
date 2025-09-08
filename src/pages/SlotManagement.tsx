import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Smartphone, 
  Monitor, 
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Settings
} from 'lucide-react';
import { slotService, Slot, CreateSlotPayload, UpdateSlotPayload } from '@/services/slotService';
import { toast } from 'sonner';

export function SlotManagement() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [filterActive, setFilterActive] = useState<number | undefined>(undefined);

  // Form states
  const [createForm, setCreateForm] = useState<CreateSlotPayload>({
    name: '',
    platform: 0,
    width: 0,
    height: 0
  });

  const [updateForm, setUpdateForm] = useState<UpdateSlotPayload>({
    slotId: 0,
    name: '',
    platform: 0,
    width: 0,
    height: 0,
    isActive: 1
  });

  // Fetch slots
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await slotService.getSlots(undefined, filterActive);
      if (response.success) {
        // Ensure we always have an array
        const slotsData = Array.isArray(response.data) ? response.data : [];
        setSlots(slotsData);
        toast.success(`Loaded ${slotsData.length} slots`);
      } else {
        toast.error(response.message || 'Failed to fetch slots');
        setSlots([]); // Set empty array on error
      }
    } catch (error) {
      toast.error('Error fetching slots');
      console.error('Error fetching slots:', error);
      setSlots([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  // Create slot
  const handleCreateSlot = async () => {
    if (!createForm.name.trim()) {
      toast.error('Slot name is required');
      return;
    }
    if (createForm.width <= 0 || createForm.height <= 0) {
      toast.error('Width and height must be greater than 0');
      return;
    }

    try {
      const response = await slotService.createSlot(createForm);
      if (response.success) {
        toast.success('Slot created successfully!');
        setCreateDialogOpen(false);
        setCreateForm({ name: '', platform: 0, width: 0, height: 0 });
        fetchSlots();
      } else {
        toast.error(response.message || 'Failed to create slot');
      }
    } catch (error) {
      toast.error('Error creating slot');
      console.error('Error creating slot:', error);
    }
  };

  // Update slot
  const handleUpdateSlot = async () => {
    if (!updateForm.name?.trim()) {
      toast.error('Slot name is required');
      return;
    }

    try {
      const response = await slotService.updateSlot(updateForm);
      if (response.success) {
        toast.success('Slot updated successfully!');
        setUpdateDialogOpen(false);
        setSelectedSlot(null);
        fetchSlots();
      } else {
        toast.error(response.message || 'Failed to update slot');
      }
    } catch (error) {
      toast.error('Error updating slot');
      console.error('Error updating slot:', error);
    }
  };

  // Open update dialog
  const openUpdateDialog = (slot: Slot) => {
    setSelectedSlot(slot);
    setUpdateForm({
      slotId: slot.slotId,
      name: slot.name,
      platform: slot.platform,
      width: parseFloat(slot.width.toString()),
      height: parseFloat(slot.height.toString()),
      isActive: slot.isActive
    });
    setUpdateDialogOpen(true);
  };

  // Get platform icon
  const getPlatformIcon = (platformId: number) => {
    switch (platformId) {
      case 0: return <Globe className="w-4 h-4" />; // Web Extension
      case 1: return <Smartphone className="w-4 h-4" />; // Mobile Extension
      case 2: return <Monitor className="w-4 h-4" />; // Desktop Site
      case 3: return <Smartphone className="w-4 h-4" />; // Mobile Site
      case 4: return <Smartphone className="w-4 h-4" />; // Mobile App Overlay
      case 5: return <Smartphone className="w-4 h-4" />; // Mobile App
      default: return <Settings className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [filterActive]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Slot Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage ad slots for different platforms
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Filter */}
              <Select value={filterActive?.toString() || 'all'} onValueChange={(value) => {
                setFilterActive(value === 'all' ? undefined : parseInt(value));
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  <SelectItem value="1">Active Only</SelectItem>
                  <SelectItem value="0">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button
                variant="outline"
                onClick={fetchSlots}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              {/* Create New Slot */}
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Slot
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Slot</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Slot Name</Label>
                      <Input
                        id="name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="Enter slot name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Select value={createForm.platform.toString()} onValueChange={(value) => {
                        setCreateForm({ ...createForm, platform: parseInt(value) });
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {slotService.getPlatformOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              <div className="flex items-center space-x-2">
                                {getPlatformIcon(option.value)}
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="width">Width (px)</Label>
                        <Input
                          id="width"
                          type="number"
                          value={createForm.width}
                          onChange={(e) => setCreateForm({ ...createForm, width: parseFloat(e.target.value) || 0 })}
                          placeholder="Width in pixels"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height">Height (px)</Label>
                        <Input
                          id="height"
                          type="number"
                          value={createForm.height}
                          onChange={(e) => setCreateForm({ ...createForm, height: parseFloat(e.target.value) || 0 })}
                          placeholder="Height in pixels"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSlot}>
                        Create Slot
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* Slots Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading slots...</span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {Array.isArray(slots) && slots.map((slot, index) => (
                <motion.div
                  key={slot.slotId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          {slot.name}
                        </CardTitle>
                        <Badge variant={slot.isActive ? "default" : "secondary"}>
                          {slot.isActive ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          {getPlatformIcon(slot.platform)}
                          <span>{slotService.getPlatformName(slot.platform)}</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Dimensions:</span> {parseFloat(slot.width.toString()).toFixed(0)} x {parseFloat(slot.height.toString()).toFixed(0)} px
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          ID: {slot.slotId}
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUpdateDialog(slot)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Update Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Slot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="update-name">Slot Name</Label>
                <Input
                  id="update-name"
                  value={updateForm.name || ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                  placeholder="Enter slot name"
                />
              </div>
              <div>
                <Label htmlFor="update-platform">Platform</Label>
                <Select value={updateForm.platform?.toString()} onValueChange={(value) => {
                  setUpdateForm({ ...updateForm, platform: parseInt(value) });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotService.getPlatformOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className="flex items-center space-x-2">
                          {getPlatformIcon(option.value)}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="update-width">Width (px)</Label>
                  <Input
                    id="update-width"
                    type="number"
                    value={updateForm.width || 0}
                    onChange={(e) => setUpdateForm({ ...updateForm, width: parseFloat(e.target.value) || 0 })}
                    placeholder="Width in pixels"
                  />
                </div>
                <div>
                  <Label htmlFor="update-height">Height (px)</Label>
                  <Input
                    id="update-height"
                    type="number"
                    value={updateForm.height || 0}
                    onChange={(e) => setUpdateForm({ ...updateForm, height: parseFloat(e.target.value) || 0 })}
                    placeholder="Height in pixels"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="update-status">Status</Label>
                <Select value={updateForm.isActive?.toString()} onValueChange={(value) => {
                  setUpdateForm({ ...updateForm, isActive: parseInt(value) });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="0">
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Inactive</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSlot}>
                  Update Slot
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {!loading && (!Array.isArray(slots) || slots.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No slots found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first ad slot to get started
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Slot
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}