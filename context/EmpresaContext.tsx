"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { AxiosError, isAxiosError } from "axios";
import { apiClient } from "@/config/apiClient";
import LoadingPage from "@/components/ui/loadingPage";

// Definir la interfaz para la empresa
export interface Empresa {
  id: string;
  NIT: string;
  Nombre: string;
  Representante: string;
  Cedula: string;
  Telefono: string;
  Direccion: string;
  requiere_osi: boolean;
  paga_recargos: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// Definir interfaz para datos básicos de empresa
export interface EmpresaBasica {
  id: string;
  NIT: string;
  Nombre: string;
}

// Definir interfaz para crear/actualizar empresa
export interface EmpresaInput {
  NIT: string;
  Nombre: string;
  Representante: string;
  Cedula: string;
  Telefono: string;
  Direccion: string;
  requiere_osi: boolean;
  paga_recargos: boolean;
}

// Definir interfaz para errores de validación
export interface ValidationError {
  campo: string;
  mensaje: string;
}

// Definir interfaz para respuestas de la API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errores?: ValidationError[];
}

// Definir la interfaz para el contexto de empresas
interface EmpresaContextType {
  empresas: Empresa[];
  currentEmpresa: Empresa | null;
  loading: boolean;
  error: string | null;
  validationErrors: ValidationError[] | null;
  
  // Operaciones CRUD
  fetchEmpresas: () => Promise<Empresa[]>;
  fetchEmpresaById: (id: string) => Promise<Empresa | null>;
  fetchEmpresasBasicos: () => Promise<EmpresaBasica[]>;
  createEmpresa: (empresa: EmpresaInput) => Promise<Empresa>;
  updateEmpresa: (id: string, empresa: EmpresaInput) => Promise<Empresa>;
  deleteEmpresa: (id: string) => Promise<boolean>;
  restoreEmpresa: (id: string) => Promise<Empresa>;
  searchEmpresas: (query: string) => Promise<Empresa[]>;
  
  // Funciones de utilidad
  clearError: () => void;
  setCurrentEmpresa: (empresa: Empresa | null) => void;
}

// Valor predeterminado para el contexto
const defaultEmpresaContext: EmpresaContextType = {
  empresas: [],
  currentEmpresa: null,
  loading: false,
  error: null,
  validationErrors: null,
  
  fetchEmpresas: async () => [],
  fetchEmpresaById: async () => null,
  fetchEmpresasBasicos: async () => [],
  createEmpresa: async () => ({} as Empresa),
  updateEmpresa: async () => ({} as Empresa),
  deleteEmpresa: async () => false,
  restoreEmpresa: async () => ({} as Empresa),
  searchEmpresas: async () => [],
  
  clearError: () => {},
  setCurrentEmpresa: () => {},
};

// Crear el contexto con el valor predeterminado
const EmpresaContext = createContext<EmpresaContextType>(defaultEmpresaContext);

// Hook personalizado para usar el contexto
export const useEmpresas = () => useContext(EmpresaContext);

// Proveedor del contexto
export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Función para manejar errores de Axios
  const handleApiError = (err: unknown, defaultMessage: string): string => {
    if (isAxiosError(err)) {
      const axiosError = err as AxiosError<ApiResponse<any>>;
      
      if (axiosError.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        const statusCode = axiosError.response.status;
        const errorMessage = axiosError.response.data?.message;
        const validationErrors = axiosError.response.data?.errores;
        
        if (validationErrors) {
          setValidationErrors(validationErrors);
        }
        
        if (statusCode === 401) {
          return "Sesión expirada o usuario no autenticado";
        } else if (statusCode === 403) {
          return "No tienes permisos para realizar esta acción";
        } else if (statusCode === 404) {
          return "Empresa no encontrada";
        } else {
          return errorMessage || `Error en la petición (${statusCode})`;
        }
      } else if (axiosError.request) {
        // La petición fue hecha pero no se recibió respuesta
        return "No se pudo conectar con el servidor. Verifica tu conexión a internet";
      } else {
        // Error al configurar la petición
        return `Error al configurar la petición: ${axiosError.message}`;
      }
    } else {
      // Error que no es de Axios
      return `${defaultMessage}: ${(err as Error).message}`;
    }
  };

  // Función para obtener todas las empresas
  const fetchEmpresas = async (): Promise<Empresa[]> => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);
    
    try {
      const response = await apiClient.get<ApiResponse<Empresa[]>>("/api/empresas");

      console.log(response)
      
      if (response.data && response.data.success) {
        const empresasData = response.data.data;
        setEmpresas(empresasData);
        return empresasData;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al obtener empresas");
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  // Función para obtener una empresa por ID
  const fetchEmpresaById = async (id: string): Promise<Empresa | null> => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);
    
    try {
      const response = await apiClient.get<ApiResponse<Empresa>>(`/api/empresas/${id}`);
      
      if (response.data && response.data.success) {
        const empresaData = response.data.data;
        setCurrentEmpresa(empresaData);
        return empresaData;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al obtener la empresa");
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener datos básicos de empresas
  const fetchEmpresasBasicos = async (): Promise<EmpresaBasica[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get<ApiResponse<EmpresaBasica[]>>("/api/empresas/basicos");
      
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al obtener datos básicos de empresas");
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Función para crear una nueva empresa
  const createEmpresa = async (empresa: EmpresaInput): Promise<Empresa> => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);
    
    try {
      const response = await apiClient.post<ApiResponse<Empresa>>("/api/empresas", empresa);
      
      if (response.data && response.data.success) {
        const nuevaEmpresa = response.data.data;
        setEmpresas([...empresas, nuevaEmpresa]);
        return nuevaEmpresa;
      } else {
        throw new Error(response.data.message || "Error al crear empresa");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al crear empresa");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar una empresa
  const updateEmpresa = async (id: string, empresa: EmpresaInput): Promise<Empresa> => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);
    
    try {
      const response = await apiClient.put<ApiResponse<Empresa>>(`/api/empresas/${id}`, empresa);
      
      if (response.data && response.data.success) {
        const empresaActualizada = response.data.data;
        
        // Actualizar la lista de empresas
        setEmpresas(empresas.map(emp => emp.id === id ? empresaActualizada : emp));
        
        // Si es la empresa actual, actualizarla también
        if (currentEmpresa && currentEmpresa.id === id) {
          setCurrentEmpresa(empresaActualizada);
        }
        
        return empresaActualizada;
      } else {
        throw new Error(response.data.message || "Error al actualizar empresa");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al actualizar empresa");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar una empresa (soft delete)
  const deleteEmpresa = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);
    
    try {
      const response = await apiClient.delete<ApiResponse<null>>(`/api/empresas/${id}`);
      
      if (response.data && response.data.success) {
        // Eliminar la empresa de la lista local
        setEmpresas(empresas.filter(emp => emp.id !== id));
        
        // Si es la empresa actual, limpiarla
        if (currentEmpresa && currentEmpresa.id === id) {
          setCurrentEmpresa(null);
        }
        
        return true;
      } else {
        throw new Error(response.data.message || "Error al eliminar empresa");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al eliminar empresa");
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para restaurar una empresa eliminada
  const restoreEmpresa = async (id: string): Promise<Empresa> => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);
    
    try {
      const response = await apiClient.put<ApiResponse<Empresa>>(`/api/empresas/${id}/restore`);
      
      if (response.data && response.data.success) {
        // Recargar la lista completa para obtener la empresa restaurada
        await fetchEmpresas();
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Error al restaurar empresa");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al restaurar empresa");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Función para buscar empresas
  const searchEmpresas = async (query: string): Promise<Empresa[]> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!query.trim()) {
        // Si la consulta está vacía, obtener todas las empresas
        return await fetchEmpresas();
      }
      
      const response = await apiClient.get<ApiResponse<Empresa[]>>(`/api/empresas/search?query=${encodeURIComponent(query)}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Error al buscar empresas");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al buscar empresas");
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
    setValidationErrors(null);
  };

  // Cargar empresas al inicializar
  useEffect(() => {
    fetchEmpresas();
    
    // Establecer un tiempo máximo para la inicialización
    const timeoutId = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
      }
    }, 5000); // 5 segundos máximo de espera
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Contexto que será proporcionado
  const empresaContext: EmpresaContextType = {
    empresas,
    currentEmpresa,
    loading,
    error,
    validationErrors,
    
    fetchEmpresas,
    fetchEmpresaById,
    fetchEmpresasBasicos,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
    restoreEmpresa,
    searchEmpresas,
    
    clearError,
    setCurrentEmpresa,
  };

  // Mostrar pantalla de carga durante la inicialización
  if (initializing) {
    return <LoadingPage>Cargando datos de empresas</LoadingPage>;
  }

  return (
    <EmpresaContext.Provider value={empresaContext}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = (): EmpresaContextType => {
  const context = useContext(EmpresaContext);

  if (!context) {
    throw new Error("useEmpresa debe ser usado dentro de un ServicesProvider");
  }

  return context;
};


export default EmpresaProvider;