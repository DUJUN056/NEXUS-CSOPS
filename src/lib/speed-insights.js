// [NEXUS-CSOPS] Vercel Speed Insights Integration
// STATUS: PERFORMANCE MONITORING ENABLED

(function () {
  // Initialize Speed Insights queue
  window.si = window.si || function () {
    (window.siq = window.siq || []).push(arguments);
  };

  // Load the Speed Insights script
  var script = document.createElement('script');
  script.defer = true;
  
  // Check if we're in development mode
  var isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Use appropriate script URL
  // In production on Vercel, this will be the auto-generated path
  // In development, use the debug script
  if (isDev) {
    script.src = 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
  } else {
    script.src = '/_vercel/speed-insights/script.js';
  }
  
  // Add SDK metadata
  script.setAttribute('data-sdkn', '@vercel/speed-insights');
  script.setAttribute('data-sdkv', '2.0.0');
  
  // Append to document head
  if (document.head) {
    document.head.appendChild(script);
  }
  
  console.log('[NEXUS-CSOPS] Speed Insights initialized');
})();
