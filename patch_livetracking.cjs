const fs = require('fs');

let code = fs.readFileSync('src/pages/LiveTracking.jsx', 'utf8');

// 1. Update imports
code = code.replace(
  'startTracking, stopTracking, getDistance,',
  'updateMyLocationOnce, getDistance,'
);

// 2. Add requestMemberLocation function
const requestLocationFn = `
  const requestMemberLocation = async (memberId) => {
    try {
      const channel = supabase.channel(\`location_requests_\${memberId}\`);
      await channel.send({
        type: 'broadcast',
        event: 'fetch_now',
        payload: { target: memberId }
      });
      // the channel is just for sending
    } catch (err) {
      console.warn('Failed to send location request:', err);
    }
  };
`;
code = code.replace(
  'const openDirections = (lat, lng) => {',
  requestLocationFn + '\n  const openDirections = (lat, lng) => {'
);

// 3. Update the initTracking useEffect
const oldEffect = `    const initTracking = async () => {
      const pos = await getCurrentLocation();
      if (pos && mountedRef.current) {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(coords);
        setMapCenter(coords);
      }
      startTracking(user.id);
      updateSharingStatus(user.id, true);
    };
    initTracking();
    return () => stopTracking();`;

const newEffect = `    const initTracking = async () => {
      const pos = await getCurrentLocation();
      if (pos && mountedRef.current) {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(coords);
        setMapCenter(coords);
      }
      await updateMyLocationOnce(user.id);
      updateSharingStatus(user.id, true);
    };
    initTracking();
    // No more background interval / watchPosition`;

code = code.replace(oldEffect, newEffect);

// 4. Update the global refresh button
code = code.replace(
  '<button onClick={fetchLocations} disabled={isRefreshing}',
  '<button onClick={() => { fetchLocations(); locations.forEach(l => requestMemberLocation(l.user_id)); }} disabled={isRefreshing}'
);

// 5. Update the member card header to add a "Fetch Location" button
const oldHeader = `<div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{name}</h3>
                        <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 \${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}\`}>`;

const newHeader = `<div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{name}</h3>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); requestMemberLocation(loc.user_id); }} 
                            className="p-1 text-slate-400 hover:text-primary-500 hover:bg-primary-50 active:scale-95 transition-all rounded-md" 
                            title={t('Fetch Location')}
                          >
                            <RefreshCw size={12} />
                          </button>
                          <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 \${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}\`}>`;

code = code.replace(oldHeader, newHeader);

// 6. Close the div we opened in the newHeader
code = code.replace(
  "{isOnline ? t('Online') : t('Offline')}\n                        </span>\n                      </div>",
  "{isOnline ? t('Online') : t('Offline')}\n                          </span>\n                        </div>\n                      </div>"
);

fs.writeFileSync('src/pages/LiveTracking.jsx', code);
