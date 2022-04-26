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
      const productAlreadyExists = cart.find(product => product.id === productId);

      const stockResponse = await api.get(`/stock/${productId}`);
      const stockData = stockResponse.data as Stock;

      if(!stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productAlreadyExists) {
        if(productAlreadyExists.amount >= stockData.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = cart.map((product) => 
            product.id === productId 
            ? ({ ...product, amount: product.amount + 1 })
            : ({ ...product })
          );

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

        return;
      }
      
      const response = await api.get(`/products/${productId}`);
      const data = response.data as Product;
      
      const updatedCart = [...cart, { ...data, amount: 1 }];

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.findIndex((product) => product.id === productId);

      if(product < 0) {
        throw new Error();
      }

      const cartRemoved = cart.filter((product) => product.id !== productId);

      setCart(cartRemoved);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartRemoved));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const responseStock = await api.get(`/stock/${productId}`)
      const stockData = responseStock.data as Stock;

      if(amount > stockData.amount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const updatedCart = cart.map((product) => {
        if(product.id !== productId) {
          return product;
        }
        
        return { ...product, amount }
      });

      // console.log(updatedCart.find(product => product.id === productId))
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
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
