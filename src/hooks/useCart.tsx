import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data } = await api.get<Product>(`products/${productId}`);
      const responseStock = await api.get<Stock>(`stock/${productId}`);

      if (responseStock.data.amount === 1) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      setCart((current) => {
        const productIndex = current.findIndex(
          (product) => product.id === productId
        );
        let newState: Product[] = [];

        if (productIndex < 0) {
          newState = [...current, { ...data, amount: 1 }];
        } else {
          newState = current.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1,
              };
            }
            return product;
          });
        }

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newState));

        return newState;
      });

      await api.put<Stock>(`stock/${productId}`, {
        amount: responseStock.data.amount - 1,
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      // const { data } = await api.get<Stock>(`stock/${productId}`);

      const actualProduct = cart.find((product) => product.id === productId);

      if (!actualProduct) {
        toast.error("Erro na remoção do produto");
        return;
      }

      // await api.put<Stock>(`stock/${productId}`, {
      //   amount: data.amount + actualProduct.amount,
      // });

      setCart((current) => {
        const filteredProducts = current.filter(
          (product) => product.id !== productId
        );

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(filteredProducts)
        );

        return filteredProducts;
      });
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }

    try {
      const { data } = await api.get<Stock>(`stock/${productId}`);

      if (amount > data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const actualProduct = cart.find((product) => product.id === productId);

      if (!actualProduct) {
        return;
      }

      // if (amount > actualProduct.amount) {
      //   api.put<Stock>(`stock/${productId}`, {
      //     amount: data.amount - 1,
      //   });
      // } else {
      //   api.put<Stock>(`stock/${productId}`, {
      //     amount: data.amount + 1,
      //   });
      // }

      setCart((current) => {
        const newState = current.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: amount,
            };
          }

          return product;
        });

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newState));

        return newState;
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
