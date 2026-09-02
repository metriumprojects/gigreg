import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'
import "react-toastify/dist/ReactToastify.css";
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CurrencyProvider } from './currency/CurrencyContext.jsx'

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Elements stripe={stripePromise}>
     <Provider store={store}>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </Provider>
    </Elements>
  </StrictMode>,
)
