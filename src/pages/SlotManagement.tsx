import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusPill } from '@/components/ui/status-pill';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSpotlight } from '@/hooks/useSpotlight';
import {
  Plus,
  Edit,
  Smartphone,
  Monitor,
  Globe,
  RefreshCw,
  Settings,
  LayoutGrid,
  Maximize2,
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
  return <Icon className={className ?? 'w-4 h-4'} strokeWidth={1.75} />;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

function SlotCard({ slot, index, canEdit, onEdit }: { slot: Slot; index: number; canEdit: boolean; onEdit: (s: Slot) => void }) {
  const spotlight = useSpotlight();
  // HALO: no occupancy/fill metric exists on the Slot API — the bar reflects
  // active/inactive status only, as a stand-in for a true fill percentage.
  const fillPct = slot.isActive ? 100 : 8;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.32, ease: easeOut }}
      className="halo-card halo-card-interactive halo-spotlight halo-rail group relative p-5 flex flex-col gap-3 focus-within:shadow-[var(--h-sh-3)]"
      {...spotlight}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="halo-eyebrow num">SLOT {String(slot.slotId).padStart(2, '0')}</span>
        <StatusPill
          status={slot.isActive ? 'live' : 'paused'}
          label={slot.isActive ? 'Active' : 'Inactive'}
          size="sm"
        />
      </div>

      <h3 className="halo-heading truncate">{slot.name}</h3>

      <span className="halo-badge halo-badge-iris w-fit">
        <PlatformIcon platformId={slot.platform} className="h-3 w-3" />
        {slotService.getPlatformName(slot.platform)}
      </span>

      {/* Fill / occupancy */}
      <div className="mt-1">
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--h-surface-3)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${fillPct}%`, background: 'var(--h-g-iris)' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--h-ink-3)' }}>
        <Maximize2 strokeWidth={1.75} className="h-3 w-3" />
        <span className="num">
          {parseFloat(slot.width.toString()).toFixed(0)}&times;{parseFloat(slot.height.toString()).toFixed(0)}
        </span>
      </div>

      {/* Actions — ghost icon pill, revealed on hover / focus-within */}
      {canEdit && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(slot)}
            className="btn-halo-ghost btn-halo-icon btn-halo-sm"
            aria-label={`Edit ${slot.name}`}
          >
            <Edit strokeWidth={1.75} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

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
    width: '',
    height: ''
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
    const w = Number(createForm.width);
    const h = Number(createForm.height);
    if (!w || w <= 0 || !h || h <= 0) {
      toast.error('Width and height must be greater than 0');
      return;
    }
    try {
      const response = await slotService.createSlot({
        ...createForm,
        width: Number(createForm.width),
        height: Number(createForm.height),
      });
      if (response.success) {
        toast.success('Slot created successfully!');
        setCreateDialogOpen(false);
        setCreateForm({ name: '', platform: 0, width: '', height: '' });
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
    <div className="halo-page">
      <div className="space-y-5">
        <PageHeader
          eyebrow="Slots"
          title="Slot management"
          subhead="Create and manage ad slots for different platforms."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterActive?.toString() ?? 'all'}
                onValueChange={(v) => setFilterActive(v === 'all' ? undefined : parseInt(v))}
              >
                <SelectTrigger className="halo-field w-40 h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All slots</SelectItem>
                  <SelectItem value="1">Active only</SelectItem>
                  <SelectItem value="0">Inactive only</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={fetchSlots}
                disabled={loading}
                className="btn-halo-outline btn-halo-sm"
              >
                <RefreshCw strokeWidth={1.75} className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {canEdit && (
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="btn-halo"
                >
                  <Plus strokeWidth={1.75} className="h-3.5 w-3.5" />
                  Create slot
                </button>
              )}
            </div>
          }
        />

        {/* Platform filter pill row */}
        <div className="halo-segment flex-wrap">
          {PLATFORM_OPTIONS.map((platform) => {
            const Icon = platform.icon;
            const isActive = activePlatform === platform.value;
            const count = countForPlatform(platform.value);

            return (
              <button
                key={platform.value}
                onClick={() => setActivePlatform(platform.value)}
                data-state={isActive ? 'active' : undefined}
                className="halo-segment-item"
              >
                <Icon strokeWidth={1.75} className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{platform.label}</span>
                <span className="halo-badge num" style={{ height: '1.125rem', padding: '0 0.4rem' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="halo-subtitle px-1">
          {activePlatform === -1
            ? `Showing all ${slots.length} slot${slots.length !== 1 ? 's' : ''}`
            : `Showing ${visibleSlots.length} ${PLATFORM_OPTIONS.find(p => p.value === activePlatform)?.label} slot${visibleSlots.length !== 1 ? 's' : ''}`
          }
        </p>

        {/* Slots grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="halo-card p-5 space-y-3">
                <div className="halo-skeleton h-4 w-16" />
                <div className="halo-skeleton h-5 w-3/4" />
                <div className="halo-skeleton h-5 w-24" />
                <div className="halo-skeleton h-1 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {visibleSlots.map((slot, index) => (
                <SlotCard key={slot.slotId} slot={slot} index={index} canEdit={canEdit} onEdit={openUpdateDialog} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && visibleSlots.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="halo-card text-center py-12"
          >
            <div className="halo-chip-lg mx-auto mb-4">
              <PlatformIcon platformId={activePlatform === -1 ? -2 : activePlatform} className="h-6 w-6" />
            </div>
            <h3 className="halo-heading">
              {activePlatform === -1
                ? 'No slots found'
                : `No ${PLATFORM_OPTIONS.find(p => p.value === activePlatform)?.label} slots`}
            </h3>
            <p className="halo-subtitle mt-1.5">
              {activePlatform === -1
                ? 'Create your first ad slot to get started.'
                : 'There are no slots configured for this platform yet.'}
            </p>
            {canEdit && (
              <button
                onClick={() => {
                  if (activePlatform !== -1) {
                    setCreateForm(prev => ({ ...prev, platform: activePlatform }));
                  }
                  setCreateDialogOpen(true);
                }}
                className="btn-halo mt-5"
              >
                <Plus strokeWidth={1.75} className="h-3.5 w-3.5" />
                Create {activePlatform === -1 ? 'first' : PLATFORM_OPTIONS.find(p => p.value === activePlatform)?.label} slot
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md halo-card rounded-[var(--h-r-xl)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="halo-heading flex items-center gap-2">
              <span className="halo-chip">
                <Plus strokeWidth={1.75} className="h-4 w-4" />
              </span>
              Create new slot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label htmlFor="name" className="halo-label">Slot name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Hero banner — Home page"
                className="halo-field mt-1.5"
              />
            </div>
            <div>
              <Label className="halo-label">Platform</Label>
              <div className="mt-1.5">
                <Select
                  value={createForm.platform.toString()}
                  onValueChange={(v) => setCreateForm({ ...createForm, platform: parseInt(v) })}
                >
                  <SelectTrigger className="halo-field">
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
                <Label htmlFor="width" className="halo-label">Width (px)</Label>
                <Input
                  id="width"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={createForm.width}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setCreateForm({ ...createForm, width: v === '' ? '' : Number(v) });
                  }}
                  placeholder="728"
                  className="halo-field mt-1.5 num"
                />
              </div>
              <div>
                <Label htmlFor="height" className="halo-label">Height (px)</Label>
                <Input
                  id="height"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={createForm.height}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setCreateForm({ ...createForm, height: v === '' ? '' : Number(v) });
                  }}
                  placeholder="90"
                  className="halo-field mt-1.5 num"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--h-line)' }}>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="btn-halo-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSlot}
                className="btn-halo"
              >
                Create slot
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md halo-card rounded-[var(--h-r-xl)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="halo-heading flex items-center gap-2">
              <span className="halo-chip">
                <Edit strokeWidth={1.75} className="h-4 w-4" />
              </span>
              Update slot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label htmlFor="update-name" className="halo-label">Slot name</Label>
              <Input
                id="update-name"
                value={updateForm.name ?? ''}
                onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                placeholder="Enter slot name"
                className="halo-field mt-1.5"
              />
            </div>
            <div>
              <Label className="halo-label">Platform</Label>
              <div className="mt-1.5">
                <Select
                  value={updateForm.platform?.toString()}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, platform: parseInt(v) })}
                >
                  <SelectTrigger className="halo-field">
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
                <Label htmlFor="update-width" className="halo-label">Width (px)</Label>
                <Input
                  id="update-width"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={updateForm.width ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setUpdateForm({ ...updateForm, width: v === '' ? undefined : Number(v) });
                  }}
                  className="halo-field mt-1.5 num"
                />
              </div>
              <div>
                <Label htmlFor="update-height" className="halo-label">Height (px)</Label>
                <Input
                  id="update-height"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={updateForm.height ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setUpdateForm({ ...updateForm, height: v === '' ? undefined : Number(v) });
                  }}
                  className="halo-field mt-1.5 num"
                />
              </div>
            </div>
            <div>
              <Label className="halo-label">Status</Label>
              <div className="mt-1.5">
                <Select
                  value={updateForm.isActive?.toString()}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, isActive: parseInt(v) })}
                >
                  <SelectTrigger className="halo-field">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <span className="halo-dot" style={{ color: 'var(--h-pos)' }} />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="0">
                      <div className="flex items-center gap-2">
                        <span className="halo-dot" style={{ color: 'var(--h-ink-3)' }} />
                        <span>Inactive</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--h-line)' }}>
              <button
                onClick={() => setUpdateDialogOpen(false)}
                className="btn-halo-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSlot}
                className="btn-halo"
              >
                Update slot
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
