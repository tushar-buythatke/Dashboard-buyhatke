import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Copy, Play, Pause, Calendar, Target, Eye, MousePointerClick, Clock, Globe, Users, Tag, MapPin, Banknote, Settings, Image as ImageIcon, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Ad, Slot } from '@/types';
import { motion } from 'framer-motion';

// Placeholder image URL
const PLACEHOLDER_IMAGE = 'https://eos.org/wp-content/uploads/2023/10/moon-2.jpg';

export function AdDetail() {
  const { campaignId, adId } = useParams<{ campaignId: string; adId: string }>();
  const navigate = useNavigate();
  const [ad, setAd] = useState<Ad | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [campaign, setCampaign] = useState<{ brandName?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId && adId) {
      fetchAdDetails();
    }
  }, [campaignId, adId]);

  const fetchAdDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ad details, slot info, and campaign info in parallel
      const [adResponse, slotsResponse, campaignResponse] = await Promise.all([
        fetch(`https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads?campaignId=${campaignId}&adId=${adId}&slotId=&status=`),
        fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/slots'),
        fetch(`https://ext1.buyhatke.com/buhatkeAdDashboard-test/campaigns?campaignId=${campaignId}`)
      ]);

      if (!adResponse.ok || !slotsResponse.ok || !campaignResponse.ok) {
        throw new Error('Failed to fetch ad details');
      }

      const [adResult, slotsResult, campaignResult] = await Promise.all([
        adResponse.json(),
        slotsResponse.json(),
        campaignResponse.json()
      ]);

      // Set ad data
      if (adResult.status === 1 && adResult.data?.adsList?.[0]) {
        setAd(adResult.data.adsList[0]);
      } else {
        setError('Ad not found');
        return;
      }

      // Set slot data
      if (slotsResult.status === 1 && slotsResult.data?.slotList) {
        const adData = adResult.data.adsList[0];
        const slotData = slotsResult.data.slotList.find((s: Slot) => s.slotId === adData.slotId);
        if (slotData) setSlot(slotData);
      }

      // Set campaign data
      if (campaignResult.status === 1 && campaignResult.data?.campaignList?.[0]) {
        setCampaign(campaignResult.data.campaignList[0]);
      }

    } catch (error) {
      console.error('Error fetching ad details:', error);
      setError('Failed to load ad details');
      toast.error('Failed to load ad details');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneAd = async () => {
    if (!ad) return;
    
    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/clone?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.adId })
      });

      if (!response.ok) throw new Error('Failed to clone ad');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success('Ad cloned successfully');
        navigate(`/campaigns/${campaignId}/ads`);
      }
    } catch (error) {
      console.error('Error cloning ad:', error);
      toast.error('Failed to clone ad');
    }
  };

  const handleStatusChange = async (newStatus: 0 | 1) => {
    if (!ad) return;

    try {
      const response = await fetch('https://ext1.buyhatke.com/buhatkeAdDashboard-test/ads/update?userId=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.adId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update ad status');
      
      const result = await response.json();
      if (result.status === 1) {
        toast.success(`Ad ${newStatus === 1 ? 'activated' : 'paused'} successfully`);
        setAd(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating ad status:', error);
      toast.error('Failed to update ad status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error || 'Ad not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
        >
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button 
                variant="ghost"
                onClick={() => navigate(`/campaigns/${campaignId}/ads`)}
                className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {ad.label}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                  {campaign?.brandName || 'Campaign'} • Ad #{ad.adId}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <Badge 
                variant={ad.status === 1 ? 'success' : 'outline'} 
                className={`font-medium text-center ${
                  ad.status === 1 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                    : ad.status === 0 
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                }`}
              >
                {ad.status === 1 ? 'Active' : ad.status === 0 ? 'Paused' : 'Draft'}
              </Badge>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/campaigns/${campaignId}/ads/${ad.adId}/edit`)}
                  className="flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloneAd}
                  className="flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Clone</span>
                </Button>
                
                {ad.status === 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(0)}
                    className="flex items-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(1)}
                    className="flex items-center space-x-2 text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <Play className="h-4 w-4" />
                    <span>Activate</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium">Impression Target</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{ad.impressionTarget.toLocaleString()}</p>
              </div>
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium">Click Target</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">{ad.clickTarget.toLocaleString()}</p>
              </div>
              <MousePointerClick className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-xs sm:text-sm font-medium">Target CTR</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {ad.impressionTarget > 0 
                    ? ((ad.clickTarget / ad.impressionTarget) * 100).toFixed(2) + '%' 
                    : '0.00%'}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-medium">Priority</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{ad.priority}</p>
              </div>
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Creative & Basic Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
                  <ImageIcon className="h-5 w-5 mr-3" />
                  Creative & Slot Details
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-6">
                {/* Ad Name */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Ad Name</h4>
                  <p className="text-blue-700 dark:text-blue-300 font-medium text-lg">{ad.label}</p>
                </div>

                {/* Creative Image */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-full max-w-sm h-64 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    {ad.creativeUrl ? (
                      <img 
                        src={ad.creativeUrl} 
                        alt="Ad creative" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'true';
                            target.src = PLACEHOLDER_IMAGE;
                          }
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <span className="text-sm font-medium">No Creative</span>
                      </div>
                    )}
                  </div>
                  
                  {slot && (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{slot.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {slot.width} x {slot.height} pixels
                      </p>
                    </div>
                  )}
                </div>

                {/* Serve Strategy */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Serve Strategy
                  </h4>
                  <Badge 
                    className={`${
                      ad.serveStrategy === 1 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' 
                        : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700'
                    }`}
                  >
                    {ad.serveStrategy === 1 ? 'User-based targeting' : 'Product-based targeting'}
                  </Badge>
                </div>

                {/* Test Phase */}
                {ad.isTestPhase && (
                  <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <p className="text-emerald-800 dark:text-emerald-200 font-medium">
                      🧪 This ad is in test phase
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Scheduling */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
                  <Calendar className="h-5 w-5 mr-3" />
                  Scheduling
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(ad.startDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(ad.endDate)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      {formatTime(ad.startTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      {formatTime(ad.endTime)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Targeting Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
                <Target className="h-5 w-5 mr-3" />
                Targeting & Audience
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Demographics */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Demographics
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                      <p className="text-gray-900 dark:text-gray-100">{ad.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Age Range</label>
                      <p className="text-gray-900 dark:text-gray-100">{ad.ageRangeMin} - {ad.ageRangeMax} years</p>
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Banknote className="h-4 w-4 mr-2" />
                    Price Range
                  </h4>
                  <div>
                    <p className="text-gray-900 dark:text-gray-100">
                      ₹{ad.priceRangeMin.toLocaleString()} - ₹{ad.priceRangeMax.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Locations */}
                {Object.keys(ad.location || {}).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Locations
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(ad.location).map(([location, priority]) => (
                        <div key={location} className="flex justify-between items-center">
                          <span className="text-gray-900 dark:text-gray-100">{location}</span>
                          <Badge variant="outline" className="text-xs">Priority: {priority}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {Object.keys(ad.categories || {}).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      Categories
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(ad.categories).map(([category, priority]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-gray-900 dark:text-gray-100">{category}</span>
                          <Badge variant="outline" className="text-xs">Priority: {priority}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sites */}
                {Object.keys(ad.sites || {}).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Sites
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(ad.sites).map(([site, priority]) => (
                        <div key={site} className="flex justify-between items-center">
                          <span className="text-gray-900 dark:text-gray-100">{site}</span>
                          <Badge variant="outline" className="text-xs">Priority: {priority}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Targets */}
                {Object.keys(ad.brandTargets || {}).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Brand Targets
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(ad.brandTargets).map(([brand, priority]) => (
                        <div key={brand} className="flex justify-between items-center">
                          <span className="text-gray-900 dark:text-gray-100">{brand}</span>
                          <Badge variant="outline" className="text-xs">Priority: {priority}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tracking & Pixels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-3" />
                Tracking & Pixels
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Impression Pixel URL</label>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-gray-100 break-all">
                      {ad.impressionPixel || 'Not configured'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Click Pixel URL</label>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-gray-100 break-all">
                      {ad.clickPixel || 'Not configured'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 