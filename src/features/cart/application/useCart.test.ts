import { mergeCarts } from './useCart';
import { Cart } from '../domain/Cart';

describe('mergeCarts', () => {
  it('should take the highest quantity when item exists in both', () => {
    const local: Cart = { items: [{ serviceId: 's1', quantity: 2 }] };
    const remote: Cart = { items: [{ serviceId: 's1', quantity: 5 }] };

    const merged = mergeCarts(local, remote);
    expect(merged.items.length).toBe(1);
    expect(merged.items[0].quantity).toBe(5);
  });

  it('should keep items that only exist in local', () => {
    const local: Cart = { items: [{ serviceId: 's1', quantity: 2 }] };
    const remote: Cart = { items: [] };

    const merged = mergeCarts(local, remote);
    expect(merged.items.length).toBe(1);
    expect(merged.items[0].serviceId).toBe('s1');
  });

  it('should keep items that only exist in remote', () => {
    const local: Cart = { items: [] };
    const remote: Cart = { items: [{ serviceId: 's2', quantity: 3 }] };

    const merged = mergeCarts(local, remote);
    expect(merged.items.length).toBe(1);
    expect(merged.items[0].serviceId).toBe('s2');
  });

  it('should merge disparate items correctly', () => {
    const local: Cart = { items: [{ serviceId: 's1', quantity: 2 }] };
    const remote: Cart = { items: [{ serviceId: 's2', quantity: 3 }] };

    const merged = mergeCarts(local, remote);
    expect(merged.items.length).toBe(2);
    expect(merged.items.find(i => i.serviceId === 's1')?.quantity).toBe(2);
    expect(merged.items.find(i => i.serviceId === 's2')?.quantity).toBe(3);
  });
});
