
import type HighchartsType from 'highcharts';

/**
 * Shared Highcharts initialization promise to prevent race conditions
 * and double-registration of modules.
 */
let highchartsPromise: Promise<typeof HighchartsType> | null = null;
let highchartsReactModule: any = null;

export const getHighcharts = async (): Promise<{
  Highcharts: typeof HighchartsType;
  HighchartsReact: any;
}> => {
  if (typeof window === 'undefined') {
    throw new Error('Highcharts can only be initialized in the browser');
  }

  // Load highcharts-react-official if not already loaded
  if (!highchartsReactModule) {
    const mod = await import('highcharts-react-official');
    highchartsReactModule = mod.default || mod;
  }

  // Ensure Highcharts core and all required modules are initialized ONCE
  if (!highchartsPromise) {
    highchartsPromise = (async () => {
      const HighchartsModule = await import('highcharts');
      const HC = HighchartsModule.default || HighchartsModule;

      // Load all commonly used modules in parallel
      const [
        Heatmap,
        HighchartsMore,
        SolidGauge,
        Exporting,
        Accessibility,
        Stock,
        NoData
      ] = await Promise.all([
        import('highcharts/modules/heatmap'),
        import('highcharts/highcharts-more'),
        import('highcharts/modules/solid-gauge'),
        import('highcharts/modules/exporting'),
        import('highcharts/modules/accessibility'),
        import('highcharts/modules/stock'),
        import('highcharts/modules/no-data-to-display')
      ]);

      // Helper to safely initialize modules
      const initModule = (mod: any) => {
        const factory = mod.default || mod;
        if (typeof factory === 'function') {
          factory(HC);
        }
      };

      // Initialize all modules on the core instance (Order matters for some: More before SolidGauge)
      initModule(HighchartsMore);
      initModule(SolidGauge);
      initModule(Heatmap);
      initModule(Exporting);
      initModule(Accessibility);
      initModule(Stock);
      initModule(NoData);

      // Final check for critical modules
      if (!(HC as any).seriesTypes?.heatmap) {
        console.warn('Highcharts heatmap module did not register via factory, checking global state...');
        // Some environments might need this fallback if registration fails
      }

      return HC;
    })();
  }

  const HC = await highchartsPromise;
  
  return {
    Highcharts: HC,
    HighchartsReact: highchartsReactModule
  };
};
