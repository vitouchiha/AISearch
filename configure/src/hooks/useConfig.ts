import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext.tsx";

export const useConfig = () => {
  return useContext(ConfigContext);
};