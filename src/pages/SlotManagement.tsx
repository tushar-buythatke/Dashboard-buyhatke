import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusPill } from '@/components/ui/status-pill';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Edit,
  Smartphone,
  Monitor,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  LayoutGrid,
  Maximize2,
  Eye
} from 'lucide-react';
import { slotService, Slot, CreateSlotPayload, UpdateSlotPayload } from '@/services/slotService';
import { toast } from 'sonner';
import { usePermissions } from '@/context/PermissionsContext';

const PLATFORM_OPTIONS = [
  { value: -1,  label: 'All',              icon: LayoutGrid },
  { value: 0,   label: 'Web Ext',          icon: Globe },
  { value: 1,   label: 'Mobile Ext',       icon: Smartphone },
  { value: 2,   label: 'Desktop Site',     icon: Monitor },
  { value: 3,   label: 'Mobile Site',      icon: Smartphone },
  { value: 4,   label: 'App Overlay',      icon: Smartphone },
  { value: 5,   label: 'Mobile App',       icon: Smartphone },
];

function PlatformIcon({ platformId, className }: { platformId: number; className?: string }) {
  const match = PLATFORM_OPTIONS.find(p => p.value === platformId);
  const Icon = match?.icon ?? Settings;
  return <Icon className={className ?? 'w-4 h-4'} />;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

export function SlotManagement() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const { canEdit } = usePermissions();

  const [activePlatform, setActivePlatform] = useState<number>(-1);
  const [filterActive, setFilterActive] = useState<number | undefined>(undefined);

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

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await slotService.getSlots(undefined, filterActive);
      if (response.success) {
        const slotsData = Array.isArray(response.data) ? response.data : [];
        setSlots(slotsData);
        toast.success(`Loaded ${slotsData.length} slots`);
      } else {
        toast.error(response.message || 'Failed to fetch slots');
        setSlots([]);
      }
    } catch (error) {
      toast.error('Error fetching slots');
      console.error('Error fetching slots:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  const visibleSlots = activePlatform === -1
    ? slots
    : slots.filter(s => s.platform === activePlatform);

  const countForPlatform = (platformValue: number) =>
    platformValue === -1 ? slots.length : slots.filter(s => s.platform === platformValue).length;

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

  useEffect(() => {
    fetchSlots();
  }, [filterActive]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        eyebrow="Slots"
        title="Slot management"
        subhead="Create and manage ad slots for different platforms"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <Select
              value={filterActive?.toString() ?? 'all'}
              onValueChange={(v) => setFilterActive(v === 'all' ? undefined : parseInt(v))}
            >
              <SelectTrigger className="h-9 w-40 border-[var(--line)] bg-[var(--bg-panel)] text-[12.5px] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                <SelectItem value="1">Active Only</SelectItem>
                <SelectItem value="0">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={fetchSlots}
              disabled={loading}
              className="h-9 gap-1.5 border-[var(--line)] bg-[var(--bg-panel)] text-[12.5px] text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text-1)]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {canEdit && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="btn-velvet h-9 gap-1.5 rounded-lg px-3.5 text-[12.5px]"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Slot
              </Button>
            )}
          </div>
        }
      />

      {/* Platform Toggle Bar — Velvet pill row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: easeOut }}
        className="velvet-surface velvet-micro-shadow p-1.5"
      >
        <div className="flex items-center gap-1 flex-wrap">
          {PLATFORM_OPTIONS.map((platform) => {
            const Icon = platform.icon;
            const isActive = activePlatform === platform.value;
            const count = countForPlatform(platform.value);

            return (
              <button
                key={platform.value}
                onClick={() => setActivePlatform(platform.value)}
                className={`
                  relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium
                  transition-all duration-300 ease-out cursor-pointer select-none
                  ${isActive
                    ? 'bg-gradient-to-b from-[var(--violet-500)] to-[var(--violet-700)] text-white shadow-[0_4px_12px_rgba(99,76,230,0.25)]'
                    : 'text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text-1)]'
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{platform.label}</span>
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                    rounded-full text-[10.5px] font-semibold tabular-nums
                    ${isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-[var(--bg-panel-2)] text-[var(--text-3)] border border-[var(--line)]'
                    }
                  `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Active platform summary label */}
      <p className="text-[12px] text-[var(--text-3)] px-1">
        {activePlatform === -1
          ? `Showing all ${slots.length} slot${slots.length !== 1 ? 's' : ''}`
          : `Showing ${visibleSlots.length} ${PLATFORM_OPTIONS.find(p => p.value === activePlatform)?.label} slot${visibleSlots.length !== 1 ? 's' : ''}`
        }
      </p>

      {/* Slots Grid — Velvet luxury tiles */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <VelvetLoader size={28} label="Loading slots" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {visibleSlots.map((slot, index) => (
              <motion.div
                key={slot.slotId}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.32, ease: easeOut }}
                whileHover={{ y: -4 }}
                className="group relative"
              >
                <div
                  className="relative overflow-hidden rounded-2xl p-4 h-full flex flex-col gap-3
                             bg-gradient-to-br from-[#fdfcff] to-[#f6f3fc]
                             dark:from-[#1a1530] dark:to-[#13102a]
                             border border-[var(--line)] hover:border-[var(--line-violet)]
                             shadow-[0_4px_24px_rgba(43,19,94,0.04)]
                             hover:shadow-[0_12px_30px_rgba(43,19,94,0.10)]
                             transition-all duration-300 ease-out"
                >
                  {/* Soft corner glow on hover */}
                  <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[var(--violet-500)]/0 group-hover:bg-[var(--violet-500)]/10 blur-2xl transition-all duration-500" />

                  {/* Header row: name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-3)]">
                        Slot
                      </p>
                      <h3 className="mt-0.5 text-[14.5px] font-semibold tracking-tight text-[var(--text-1)] truncate">
                        {slot.name}
                      </h3>
                    </div>
                    <StatusPill
                      status={slot.isActive ? 'live' : 'paused'}
                      label={slot.isActive ? 'Active' : 'Inactive'}
                      size="sm"
                    />
                  </div>

                  {/* Platform capsule badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full
                                 border border-[var(--line-violet)]
                                 bg-[var(--bg-tint)]
                                 px-2.5 py-1 text-[11px] font-medium text-[var(--indigo-500)]"
                    >
                      <PlatformIcon platformId={slot.platform} className="h-3 w-3" />
                      {slotService.getPlatformName(slot.platform)}
                    </span>
                  </div>

                  {/* Dimensions metadata */}
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/60 px-2.5 py-1.5">
                    <Maximize2 className="h-3 w-3 text-[var(--text-3)]" />
                    <span className="font-mono text-[11.5px] font-semibold tabular-nums text-[var(--text-1)]">
                      {parseFloat(slot.width.toString()).toFixed(0)} × {parseFloat(slot.height.toString()).toFixed(0)}
                    </span>
                    <span className="text-[10px] text-[var(--text-3)]">px</span>
                    <span className="ml-auto font-mono text-[10px] text-[var(--text-3)]">
                      #{slot.slotId}
                    </span>
                  </div>

                  {/* Edit button (slide-up on hover) */}
                  {canEdit && (
                    <div className="mt-auto flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUpdateDialog(slot)}
                        className="h-7 gap-1 px-2.5 text-[11.5px] text-[var(--text-2)] opacity-70 hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] group-hover:opacity-100 transition-all"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && visibleSlots.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="velvet-surface velvet-micro-shadow rounded-2xl p-12 text-center"
        >
          {activePlatform === -1 ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tint)] border border-[var(--line-violet)]">
                <Settings className="h-6 w-6 text-[var(--indigo-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">No slots found</h3>
              <p className="mt-1.5 text-[12.5px] text-[var(--text-3)]">
                Create your first ad slot to get started
              </p>
              {canEdit && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="btn-velvet h-9 mt-5 gap-1.5 px-4 text-[12.5px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Slot
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tint)] border border-[var(--line-violet)]">
                <PlatformIcon
                  platformId={activePlatform}
                  className="h-6 w-6 text-[var(--indigo-500)]"
                />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-1)]">
                No {PLATFORM_OPTIONS.find(p => p.value === activePlatform)?.label} slots
              </h3>
              <p className="mt-1.5 text-[12.5px] text-[var(--text-3)]">
                There are no slots configured for this platform yet
              </p>
              {canEdit && (
                <Button
                  onClick={() => {
                    setCreateForm(prev => ({ ...prev, platform: activePlatform }));
                    setCreateDialogOpen(true);
                  }}
                  className="btn-velvet h-9 mt-5 gap-1.5 px-4 text-[12.5px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create {PLATFORM_OPTIONS.find(p => p.value === activePlatform)?.label} Slot
                </Button>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md border-[var(--line)] bg-[var(--bg-panel)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-1)]">Create new slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Slot name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Hero banner — Home page"
                className="mt-1.5 border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Platform</Label>
              <div className="mt-1.5">
                <Select
                  value={createForm.platform.toString()}
                  onValueChange={(v) => setCreateForm({ ...createForm, platform: parseInt(v) })}
                >
                  <SelectTrigger className="border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)]">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotService.getPlatformOptions().filter(o => o.value !== -1).map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className="flex items-center gap-2">
                          <PlatformIcon platformId={option.value} className="h-3.5 w-3.5" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="width" className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={createForm.width}
                  onChange={(e) => setCreateForm({ ...createForm, width: parseFloat(e.target.value) || 0 })}
                  placeholder="728"
                  className="mt-1.5 border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={createForm.height}
                  onChange={(e) => setCreateForm({ ...createForm, height: parseFloat(e.target.value) || 0 })}
                  placeholder="90"
                  className="mt-1.5 border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
                className="h-9 px-3 text-[12.5px] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel-2)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSlot}
                className="btn-velvet h-9 px-4 text-[12.5px]"
              >
                Create slot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md border-[var(--line)] bg-[var(--bg-panel)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-1)]">Update slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="update-name" className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Slot name</Label>
              <Input
                id="update-name"
                value={updateForm.name ?? ''}
                onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                placeholder="Enter slot name"
                className="mt-1.5 border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Platform</Label>
              <div className="mt-1.5">
                <Select
                  value={updateForm.platform?.toString()}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, platform: parseInt(v) })}
                >
                  <SelectTrigger className="border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)]">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotService.getPlatformOptions().filter(o => o.value !== -1).map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className="flex items-center gap-2">
                          <PlatformIcon platformId={option.value} className="h-3.5 w-3.5" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="update-width" className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Width (px)</Label>
                <Input
                  id="update-width"
                  type="number"
                  value={updateForm.width ?? 0}
                  onChange={(e) => setUpdateForm({ ...updateForm, width: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
                />
              </div>
              <div>
                <Label htmlFor="update-height" className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Height (px)</Label>
                <Input
                  id="update-height"
                  type="number"
                  value={updateForm.height ?? 0}
                  onChange={(e) => setUpdateForm({ ...updateForm, height: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)] focus:border-[var(--line-violet)]"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">Status</Label>
              <div className="mt-1.5">
                <Select
                  value={updateForm.isActive?.toString()}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, isActive: parseInt(v) })}
                >
                  <SelectTrigger className="border-[var(--line)] bg-[var(--bg-panel-2)] text-[var(--text-1)] focus:ring-2 focus:ring-[var(--line-violet)]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--pos)]" />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="0">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-3)]" />
                        <span>Inactive</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setUpdateDialogOpen(false)}
                className="h-9 px-3 text-[12.5px] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-panel-2)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSlot}
                className="btn-velvet h-9 px-4 text-[12.5px]"
              >
                Update slot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
