import React from 'react';
import Hero from './components/hero';
import Comparison from './components/Comparison';
import Benefits from './components/Benefits';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import StickyBar from './components/StickyBar';
import { usePayment } from './hooks/usePayment';

function App() {
  const { startSubscription, cancelSubscription } = usePayment();

  return (
    <div className="App">
      <div className="flow-bg" />
      <div className="grid-overlay" />

      <Hero />
      <Comparison />
      <Benefits />
      <Pricing onSubscribe={(plan) => startSubscription(plan)} />
      <FAQ />
      <FinalCTA />
      <Footer onCancelSubscription={cancelSubscription} />
      <StickyBar />
    </div>
  );
}

export default App;
