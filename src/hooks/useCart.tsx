import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart];

      const product = currentCart.find(product => product.id === productId);
      if (!product) {
        const productRequest = await api.get(`/products/${productId}`);

        const newProduct = productRequest.data;
        newProduct.amount = 1

        currentCart.push(newProduct)
        setCart(currentCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart))

        return
      }
      const stockRequest = await api.get(`/stock/${productId}`);

      const productStock: Stock = stockRequest.data;
      
      if (product.amount + 1 > productStock.amount) 
        toast.error('Quantidade solicitada fora de estoque');
      else {
        product.amount += 1;
        const remainingProducts = currentCart.filter(product => product.id !== productId);
        const updatedCart = [...remainingProducts, product];

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      
      if (!product) {
        toast.error("Erro na remoção do produto")
        return
      }

      const remainingProducts = cart.filter(product => product.id !== productId);

      setCart(remainingProducts)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(remainingProducts))
    } catch {
      toast.error('Não foi possível remover o produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return
      const currentCart = [...cart];

      const stockRequest = await api.get(`stock/${productId}`);

      const stock: Stock = stockRequest.data;

      const currentProduct = currentCart.find(product => product.id === productId);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        currentProduct && (currentProduct.amount = amount);
        setCart(currentCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart))
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
