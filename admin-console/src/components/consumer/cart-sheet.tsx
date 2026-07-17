import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Shirt, Briefcase, Sofa, Droplets, Wind, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCart } from "@/context/cart-context";
import { formatINR } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import { getServiceImage } from "@/lib/images";

export function CartSheet() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, subtotalMinor, itemCount } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b border-border/40 bg-muted/20">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-brand" />
            Your Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-20">
              <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg">Your cart is empty</h3>
              <p className="text-muted-foreground text-sm max-w-[200px]">
                Add some services from our catalog to get started.
              </p>
              <Button onClick={() => setIsCartOpen(false)} className="mt-4" variant="outline">
                Browse Services
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => {
                const itemTotal = (item.service.priceMinor || 0) + item.selectedAddons.reduce((sum, a) => sum + a.priceMinor, 0);
                
                return (
                  <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-muted/20 border border-border/40 relative group">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border border-border/50 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    
                    <div className="h-16 w-16 rounded-xl overflow-hidden flex flex-shrink-0 bg-muted relative">
                      <img 
                        src={getServiceImage(item.service.name)} 
                        alt={item.service.name} 
                        className="object-cover w-full h-full"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm truncate">{item.service.name}</h4>
                        <div className="text-brand font-bold text-sm mt-1">
                          {formatINR(itemTotal)}
                        </div>
                        {item.selectedAddons.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.selectedAddons.map(addon => (
                              <span key={addon.name} className="text-[10px] bg-gold/20 text-brand px-1.5 py-0.5 rounded-sm">
                                + {addon.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center bg-background rounded-lg border border-border/50 h-8">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 flex items-center justify-center hover:bg-muted/50 rounded-l-lg transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 flex items-center justify-center hover:bg-muted/50 rounded-r-lg transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <SheetFooter className="p-6 border-t border-border/40 bg-background flex flex-col gap-4 sm:flex-col">
            <div className="flex justify-between w-full text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatINR(subtotalMinor)}</span>
            </div>
            <div className="flex justify-between w-full font-bold text-lg">
              <span>Total</span>
              <span className="text-brand">{formatINR(subtotalMinor)}</span>
            </div>
            <Button onClick={handleCheckout} size="lg" className="w-full bg-brand text-gold hover:bg-brand/90 mt-2 h-12 text-base font-semibold shadow-lg shadow-brand/20">
              Checkout <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
