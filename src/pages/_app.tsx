import { AppPropsWithLayout } from "../types"
import { Hydrate, QueryClientProvider } from "@tanstack/react-query"
import { RootLayout } from "src/layouts"
import { queryClient } from "src/libs/react-query"
import { Analytics } from "@vercel/analytics/next"
import GoogleAnalytics from "src/components/GoogleAnalytics"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Disable console.log in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {}
}

function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout || ((page) => page)

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <RootLayout>{getLayout(<Component {...pageProps} />)}</RootLayout>
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
      </Hydrate>
    </QueryClientProvider>
  )
}

export default App
