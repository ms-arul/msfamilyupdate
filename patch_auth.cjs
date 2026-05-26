const fs = require('fs');

let authCode = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

// 1. Add import for updateMyLocationOnce
authCode = authCode.replace(
  "import { applyTheme } from '../utils/themeService';",
  "import { applyTheme } from '../utils/themeService';\nimport { updateMyLocationOnce } from '../utils/trackingService';"
);

// 2. Add useEffect for listening to location broadcasts
const effectHook = `  useEffect(() => {
    if (!user) return;
    
    // Listen for on-demand location requests from other family members
    const locationChannel = supabase.channel(\`location_requests_\${user.id}\`)
      .on('broadcast', { event: 'fetch_now' }, async () => {
        try {
          // Verify sharing status before responding to requests
          const { data } = await supabase.from('user_locations').select('is_sharing').eq('user_id', user.id).single();
          if (data?.is_sharing) {
             await updateMyLocationOnce(user.id);
          }
        } catch (err) {
          console.warn('Silent location update failed:', err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [user]);

  return (`;

authCode = authCode.replace('  return (', effectHook);

fs.writeFileSync('src/context/AuthContext.jsx', authCode);
