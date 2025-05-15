"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AxiosError, isAxiosError } from "axios";
import { apiClient } from "@/config/apiClient";
import LoadingPage from "@/components/ui/loadingPage";
import { addToast } from "@heroui/toast";
import { SortDescriptor } from "@/components/ui/customTable";
import { useAuth } from "./AuthContext";
import socketService from "@/services/socketService";

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

export interface BusquedaParams {
  page?: number;
  limit?: number;
  search?: string; // Para búsqueda general (nombre, apellido, correo, etc.)
  tipo_identificacion?: string | string[];
  tipo_contrato?: string | string[];
  sort?: string;
  order?: "ASC" | "DESC";
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

export interface EmpresasState {
  data: Empresa[];
  count: number;
  totalPages: number;
  currentPage: number;
}


export interface SocketEventLog {
  eventName: string;
  data: any;
  timestamp: Date;
}

// Definir la interfaz para el contexto de empresas
interface EmpresaContextType {
  empresasState: EmpresasState;
  currentEmpresa: Empresa | null;
  loading: boolean;
  error: string | null;
  validationErrors: ValidationError[] | null;

  // Operaciones CRUD
  fetchEmpresas: (paramsBusqueda: BusquedaParams) => Promise<void>;
  fetchEmpresaById: (id: string) => Promise<Empresa | null>;
  createEmpresa: (empresa: EmpresaInput) => Promise<Empresa>;
  updateEmpresa: (id: string, empresa: EmpresaInput) => Promise<Empresa>;
  deleteEmpresa: (id: string) => Promise<boolean>;

  // Funciones de utilidad
  handlePageChange: (page: number) => void;
  handleSortChange: (descriptor: SortDescriptor) => void;
  clearError: () => void;
  setCurrentEmpresa: (empresa: Empresa | null) => void;


  // Propiedades para Socket.IO
  socketConnected: boolean;
  socketEventLogs: SocketEventLog[];
  clearSocketEventLogs: () => void;
  connectSocket?: (userId: string) => void;
  disconnectSocket?: () => void;
}

// Crear el contexto con el valor predeterminado
const EmpresaContext = createContext<EmpresaContextType | undefined>(
  undefined,
);

// Proveedor del contexto
export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [empresasState, setEmpresasState] = useState<EmpresasState>({
    data: [],
    count: 0,
    totalPages: 1,
    currentPage: 1,
  });
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Estado para Socket.IO
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketEventLogs, setSocketEventLogs] = useState<SocketEventLog[]>([]);

  const { user } = useAuth();
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "Nombre",
    direction: "ascending",
  });

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
  const fetchEmpresas = async (paramsBusqueda: BusquedaParams = {}) => {
    setLoading(true);
    clearError();

    try {
      // Prepara los parámetros básicos
      const params: any = {
        page: paramsBusqueda.page || empresasState.currentPage,
        limit: paramsBusqueda.limit || 10,
        sort: paramsBusqueda.sort || sortDescriptor.column,
        order: paramsBusqueda.order || sortDescriptor.direction,
      };

      // Añade el término de búsqueda si existe
      if (paramsBusqueda.search) {
        params.search = paramsBusqueda.search;
      }

      const response = await apiClient.get<ApiResponse<Empresa[]>>(
        "/api/empresas",
        {
          params,
        },
      );

      console.log(response)


      if (response.data && response.data.success) {
        setEmpresasState({
          data: response.data.data,
          count: response.data.count || 0,
          totalPages: response.data.totalPages || 1,
          currentPage: parseInt(params.page) || 1,
        });

        return;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al obtener conductores");

      setError(errorMessage);
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

        addToast({
          title: "Empresa creada",
          description: `Se ha creado la empresa ${nuevaEmpresa.Nombre} correctamente.`,
          color: "success"
        });

        return nuevaEmpresa;
      } else {
        throw new Error(response.data.message || "Error al crear empresa");
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, "Error al crear empresa");
      setError(errorMessage);

      // Manejo específico para errores de validación (como el NIT duplicado)
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);

        // Mostrar cada error de validación como un toast separado
        Object.entries(err.response.data.errors).forEach(([field, message]: [string, any]) => {
          addToast({
            title: `Error en ${field}`,
            description: message,
            color: "danger"
          });
        });
      } else if (err.response?.status === 409) {
        // Error específico para NIT duplicado
        addToast({
          title: "Error de duplicación",
          description: "El NIT ingresado ya existe en el sistema.",
          color: "danger"
        });
      } else {
        // Error general
        addToast({
          title: "Error al crear empresa",
          description: errorMessage,
          color: "danger"
        });
      }

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

        addToast({
          title: "Empresa actualizada",
          description: `Se ha actualizado la empresa ${empresaActualizada.Nombre} correctamente.`,
          color: "success"
        });

        return empresaActualizada;
      } else {
        throw new Error(response.data.message || "Error al actualizar empresa");
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, "Error al actualizar empresa");
      setError(errorMessage);

      // Manejo específico para errores de validación (como el NIT duplicado)
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);

        // Mostrar cada error de validación como un toast separado
        Object.entries(err.response.data.errors).forEach(([field, message]: [string, any]) => {
          addToast({
            title: `Error en ${field}`,
            description: message,
            color: "danger"
          });
        });
      } else if (err.response?.status === 409) {
        // Error específico para NIT duplicado
        addToast({
          title: "Error de duplicación",
          description: "El NIT ingresado ya existe en el sistema.",
          color: "danger"
        });
      } else {
        // Error general
        addToast({
          title: "Error al actualizar empresa",
          description: errorMessage,
          color: "danger"
        });
      }

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


  // Funciones de utilidad
  const handlePageChange = (page: number) => {
    setEmpresasState((prevState) => ({
      ...prevState,
      currentPage: page,
    }));
  };

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setEmpresasState((prevState) => ({
      ...prevState,
      currentPage: 1,
    }));

    const params: BusquedaParams = {
      page: empresasState.currentPage,
    };

    fetchEmpresas(params);
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
    setValidationErrors(null);
  };

    // Efecto que se ejecuta cuando cambia la página actual
  useEffect(() => {
    const params: BusquedaParams = {
      page: empresasState.currentPage,
    };

    fetchEmpresas(params);
  }, [empresasState.currentPage]);

  // Cargar empresas al inicializar
  useEffect(() => {
    const params: BusquedaParams = {
      page: empresasState.currentPage,
    };

    fetchEmpresas(params);

    // Establecer un tiempo máximo para la inicialización
    const timeoutId = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
      }
    }, 5000); // 5 segundos máximo de espera

    return () => clearTimeout(timeoutId);
  }, []);

  // Inicializar Socket.IO cuando el usuario esté autenticado
  useEffect(() => {
    if (user?.id) {
      // Conectar socket
      socketService.connect(user.id);

      // Verificar conexión inicial y configurar manejo de eventos de conexión
      const checkConnection = () => {
        const isConnected = socketService.isConnected();

        setSocketConnected(isConnected);
      };

      // Verificar estado inicial
      checkConnection();

      // Manejar eventos de conexión
      const handleConnect = () => {
        setSocketConnected(true);
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
        addToast({
          title: "Error",
          description: "Desconectado de actualizaciones en tiempo real",
          color: "danger",
        });
      };

      const handleConductorCreado = (data: Conductor) => {
        setSocketEventLogs((prev) => [
          ...prev,
          {
            eventName: "conductor:creado",
            data,
            timestamp: new Date(),
          },
        ]);

        addToast({
          title: "Nuevo Conductor",
          description: `Se ha creado un nuevo conductor: ${data.nombre} ${data.apellido}`,
          color: "success",
        });
      };

      const handleConductorActualizado = (data: Conductor) => {
        setSocketEventLogs((prev) => [
          ...prev,
          {
            eventName: "conductor:actualizado",
            data,
            timestamp: new Date(),
          },
        ]);

        addToast({
          title: "Conductor Actualizado",
          description: `Se ha actualizado la información del conductor: ${data.nombre} ${data.apellido}`,
          color: "primary",
        });
      };

      // Registrar manejadores de eventos de conexión
      socketService.on("connect", handleConnect);
      socketService.on("disconnect", handleDisconnect);

      // Registrar manejadores de eventos de conductores
      socketService.on("conductor:creado", handleConductorCreado);
      socketService.on("conductor:actualizado", handleConductorActualizado);

      return () => {
        // Limpiar al desmontar
        socketService.off("connect");
        socketService.off("disconnect");

        // Limpiar manejadores de eventos de conductores
        socketService.off("conductor:creado");
        socketService.off("conductor:actualizado");
      };
    }
  }, [user?.id]);

  // Función para limpiar el registro de eventos de socket
  const clearSocketEventLogs = useCallback(() => {
    setSocketEventLogs([]);
  }, []);

  // Contexto que será proporcionado
  const empresaContext: EmpresaContextType = {
    empresasState,
    currentEmpresa,
    loading,
    error,
    validationErrors,

    fetchEmpresas,
    fetchEmpresaById,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,

    // Propiedades para Socket.IO
    socketConnected,
    socketEventLogs,
    clearSocketEventLogs,

    handlePageChange,
    handleSortChange,
    clearError,
    setCurrentEmpresa,
  };

  // Mostrar pantalla de carga durante la inicialización
  if (initializing) {
    return <LoadingPage>Cargando datos Empresas</LoadingPage>;
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