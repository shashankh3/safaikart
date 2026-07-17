import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getServiceImage } from "@/lib/images";
import { useAuth } from "@/context/auth-context";
import { useCategories, useServices } from "@/hooks/useCatalog";
import { Sparkles, ArrowRight, Loader2, Star, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { motion } from "framer-motion";

import { useCart } from "@/context/cart-context";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

function Index() {
  const navigate = useNavigate();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredServices = services?.filter(s => 
    selectedCategory ? s.categoryId === selectedCategory : true
  ) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-brand selection:text-gold">
      <main className="flex-1 flex flex-col w-full">
        {/* Hero Section */}
        <section className="relative w-full bg-brand text-white overflow-hidden py-32 px-4">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-brand/50 to-brand"></div>
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="container mx-auto max-w-5xl relative z-10 flex flex-col items-center text-center space-y-8"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold backdrop-blur-sm">
              <Sparkles className="mr-2 h-4 w-4" /> Premium Care for Your Garments
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Flawless Cleaning, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-200">Delivered to You.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
              Experience the luxury of professional dry cleaning and laundry services with doorstep pickup and delivery.
            </motion.p>
            
            <motion.div variants={fadeUp} className="pt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button size="lg" className="rounded-2xl bg-gold text-brand hover:bg-yellow-400 h-16 px-10 text-lg font-bold shadow-xl shadow-gold/20 transition-all hover:scale-105">
                Explore Services <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl border-white/20 text-white bg-white/5 hover:bg-white/10 h-16 px-10 text-lg font-bold backdrop-blur-sm transition-all">
                How it Works
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Bar */}
        <div className="bg-white border-b border-border/40 py-8">
          <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <Shield className="h-8 w-8 text-gold" />
              <div>
                <h4 className="font-bold text-foreground">Premium Quality</h4>
                <p className="text-sm">Expert fabric care</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <Clock className="h-8 w-8 text-gold" />
              <div>
                <h4 className="font-bold text-foreground">Express Delivery</h4>
                <p className="text-sm">24-48 hour turnaround</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <Star className="h-8 w-8 text-gold" />
              <div>
                <h4 className="font-bold text-foreground">Top Rated</h4>
                <p className="text-sm">4.9/5 from customers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="flex flex-col items-center text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand">Explore Categories</h2>
            <div className="h-1.5 w-12 bg-gold rounded-full"></div>
          </div>

          {categoriesLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-10 w-10 animate-spin text-gold" />
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {(categories || []).map((cat) => (
                <motion.div key={cat.id} variants={fadeUp}>
                  <Card 
                    onClick={() => {
                      setSelectedCategory(cat.id === selectedCategory ? null : cat.id);
                      document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`rounded-3xl border hover:shadow-xl hover:border-gold/50 transition-all cursor-pointer group overflow-hidden ${
                      selectedCategory === cat.id 
                        ? "border-gold bg-gold/10 ring-2 ring-gold/20" 
                        : "border-border/40 bg-white"
                    }`}
                  >
                    <CardContent className="p-8 flex flex-col items-center text-center gap-4 relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-brand/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="h-16 w-16 rounded-2xl bg-brand/5 text-brand flex items-center justify-center group-hover:scale-110 group-hover:bg-brand group-hover:text-gold transition-all duration-300">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      <span className="font-bold text-lg">{cat.name}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Services Section */}
        <section id="services-section" className="bg-muted/30 py-24">
          <div className="container mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand">
                  {selectedCategory ? categories?.find(c => c.id === selectedCategory)?.name : "Popular Services"}
                </h2>
                <div className="h-1.5 w-12 bg-gold rounded-full"></div>
              </div>
              {selectedCategory && (
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedCategory(null)}
                  className="text-muted-foreground hover:text-brand font-semibold"
                >
                  Clear Filter
                </Button>
              )}
            </div>

            {servicesLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-10 w-10 animate-spin text-gold" />
              </div>
            ) : (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredServices.slice(0, selectedCategory ? undefined : 6).map((service) => (
                  <motion.div key={service.id} variants={fadeUp} className="h-full">
                    <Card className="rounded-3xl border-border/40 overflow-hidden flex flex-col bg-white hover:shadow-2xl hover:shadow-brand/5 transition-all duration-500 group h-full">
                      <div className="h-48 flex items-center justify-center border-b border-border/30 relative overflow-hidden bg-muted">
                        <img 
                          src={getServiceImage(service.name)} 
                          alt={service.name} 
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                      <CardContent className="p-8 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4 gap-4">
                          <h3 className="font-bold text-xl leading-tight text-brand group-hover:text-gold transition-colors">{service.name}</h3>
                          <span className="font-extrabold text-brand bg-brand/5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap">
                            {formatINR(service.priceMinor || 0)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-auto pt-4 font-medium flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                          Priced per {service.unit || 'item'}
                        </p>
                        <Button 
                          className="w-full mt-6 rounded-2xl bg-white border-2 border-brand text-brand hover:bg-brand hover:text-gold font-bold h-12 transition-all"
                          onClick={() => addItem(service, 1)}
                        >
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
            {(!selectedCategory && filteredServices.length > 6) && (
              <Button 
                onClick={() => document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" })}
                variant="outline" 
                className="w-full mt-8 md:hidden h-14 rounded-2xl border-brand text-brand font-bold"
              >
                View All Services
              </Button>
            )}
            
            {filteredServices.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-xl font-semibold mb-2">No services found in this category.</p>
                <Button variant="link" onClick={() => setSelectedCategory(null)}>View all services</Button>
              </div>
            )}
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="w-full border-t border-border/40 bg-white py-12">
        <div className="container mx-auto px-6 text-center flex flex-col items-center">
          <div className="h-10 w-10 rounded-xl bg-brand/5 text-brand grid place-items-center mb-6">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            &copy; {new Date().getFullYear()} SafaiKart. Premium Garment Care.
          </div>
        </div>
      </footer>
    </div>
  );
}
