"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AxiosError, isAxiosError } from "axios";
import { addToast } from "@heroui/toast";

import { useAuth } from "./AuthContext";

import { apiClient } from "@/config/apiClient";
import LoadingPage from "@/components/ui/loadingPage";
import { SortDescriptor } from "@/components/ui/customTable";
import socketService from "@/services/socketService";

// Definir la interfaz para la empresa
export interface Empresa {
  id: string;
  nit: string;
  nombre: string;
  representante: string;
  cedula: string;
  telefono: number;
  direccion: string;
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
  nit: string;
  nombre: string;
  representante: string;
  cedula: string;
  telefono: string;
  direccion: string;
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
  count?: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
  errores?: ValidationError[];
}

export interface EmpresasState {
  data: Empresa[];
  count: number;
  totalPages: number;
  currentPage: number;
}

export interface CrearEmpresaRequest {
  nombre: string;
  nit: string;
  representante: string;
  cedula: string;
  telefono: number;
  direccion: string;
}

export interface ActualizarEmpresaRequest
  extends Partial<CrearEmpresaRequest> {}

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
  createEmpresa: (data: CrearEmpresaRequest) => Promise<Empresa | null>;
  updateEmpresa: (
    id: string,
    data: ActualizarEmpresaRequest,
  ) => Promise<Empresa | null>;
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
const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

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
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    ValidationError[] | null
  >(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Estado para Socket.IO
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketEventLogs, setSocketEventLogs] = useState<SocketEventLog[]>([]);

  const { user } = useAuth();
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "nombre",
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
      const errorMessage = handleApiError(err, "Error al obtener empresas");

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
      const response = await apiClient.get<ApiResponse<Empresa>>(
        `/api/empresas/${id}`,
      );

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
  const createEmpresa = async (data: CrearEmpresaRequest): Promise<Empresa> => {
    // Cambiado el tipo de retorno para no permitir null
    clearError();

    try {
      const response = await apiClient.post<ApiResponse<Empresa>>(
        "/api/empresas",
        data,
      );

      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Error al crear conductor");
      }
    } catch (err: any) {
      // Definir un mensaje de error predeterminado
      let errorTitle = "Error al crear conductor";
      let errorDescription = "Ha ocurrido un error inesperado.";

      // Manejar errores específicos por código de estado
      if (err.response) {
        switch (err.response.status) {
          case 400: // Bad Request
            errorTitle = "Error en los datos enviados";

            // Verificar si tenemos detalles específicos del error en la respuesta
            if (err.response.data && err.response.data.message) {
              errorDescription = err.response.data.message;
            }

            // Verificar si hay errores específicos en formato español (errores)
            if (
              err.response.data &&
              err.response.data.errores &&
              Array.isArray(err.response.data.errores)
            ) {
              // Mapeo de nombres de campos para mensajes más amigables
              const fieldLabels: Record<string, string> = {
                nombre: "nombre",
                nit: "nit",
              };

              // Mostrar cada error de validación como un toast separado
              let errorShown = false;

              err.response.data.errores.forEach(
                (error: { campo: string; mensaje: string }) => {
                  errorShown = true;
                  const fieldLabel = fieldLabels[error.campo] || error.campo;

                  // Personalizar mensajes para errores comunes
                  let customMessage = error.mensaje;

                  if (error.mensaje.includes("must be unique")) {
                    customMessage = `Este ${fieldLabel.toLowerCase()} ya está registrado en el sistema`;
                  }

                  addToast({
                    title: `Error en ${fieldLabel}`,
                    description: customMessage,
                    color: "danger",
                  });
                },
              );

              // IMPORTANTE: Ya no hacemos return null aquí
              // Solo actualizamos el mensaje de error general
              if (errorShown) {
                setError(errorDescription);
                // Arrojamos un nuevo error en lugar de retornar null
                throw new Error("Error de validación en los campos");
              }
            }

            // Verificar errores específicos comunes en el mensaje
            if (
              errorDescription.includes("unique") ||
              errorDescription.includes("duplicado")
            ) {
              // Error genérico de duplicación
              errorTitle = "Datos duplicados";
              errorDescription =
                "Algunos de los datos ingresados ya existen en el sistema.";

              // Intentar ser más específico basado en el mensaje completo
              if (errorDescription.toLowerCase().includes("nombre")) {
                errorTitle = "Nombre duplicado";
                errorDescription = "Ya existe una empresa con este nombre.";
              } else if (errorDescription.toLowerCase().includes("nit")) {
                errorTitle = "nit duplicado";
                errorDescription = "Ya existe una empresa con este nit.";
              }
            }
            break;

          // Los demás casos igual que antes...
        }
      } else if (err.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        errorTitle = "Error de conexión";
        errorDescription =
          "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
      } else {
        // Algo sucedió al configurar la solicitud que desencadenó un error
        errorTitle = "Error en la solicitud";
        errorDescription =
          err.message || "Ha ocurrido un error al procesar la solicitud.";
      }

      // Guardar el mensaje de error para referencia en el componente
      setError(errorDescription);

      // Mostrar el toast con el mensaje de error
      addToast({
        title: errorTitle,
        description: errorDescription,
        color: "danger",
      });

      // Registrar el error en la consola para depuración
      console.error("Error detallado:", err);

      // Siempre lanzamos el error, nunca retornamos null
      throw err;
    }
    // Ya no necesitamos un bloque finally aquí, el setLoading lo manejamos en guardarConductor
  };

  // Función para actualizar una empresa
  const updateEmpresa = async (
    id: string,
    data: ActualizarEmpresaRequest,
  ): Promise<Empresa | null> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.put<ApiResponse<Empresa>>(
        `/api/empresas/${id}`,
        data,
      );

      if (response.data && response.data.success) {
        const conductorActualizado = response.data.data;

        // Actualizar el currentConductor si corresponde al mismo ID
        if (currentEmpresa && currentEmpresa.id === id) {
          setCurrentEmpresa(conductorActualizado);
        }

        const params: BusquedaParams = {
          page: empresasState.currentPage,
        };

        // Actualizar la lista de conductores
        fetchEmpresas(params);

        return conductorActualizado;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(
        err,
        "Error al actualizar el conductor",
      );

      setError(errorMessage);

      return null;
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar una empresa (soft delete)
  const deleteEmpresa = async (id: string): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.delete<ApiResponse<any>>(
        `/api/empresas/${id}`,
      );

      if (response.data && response.data.success) {
        // Si el conductor eliminado es el actual, limpiarlo
        if (currentEmpresa && currentEmpresa.id === id) {
          setCurrentEmpresa(null);
        }

        const params: BusquedaParams = {
          page: empresasState.currentPage,
        };

        // Refrescar la lista después de eliminar
        fetchEmpresas(params);

        return true;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(
        err,
        "Error al eliminar el conductor",
      );

      setError(errorMessage);

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Funciones de utilidad
  const handlePageChange = (page: number) => {
    console.log(page);
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

      const handleConductorCreado = (data: Empresa) => {
        setSocketEventLogs((prev) => [
          ...prev,
          {
            eventName: "empresa:creado",
            data,
            timestamp: new Date(),
          },
        ]);

        addToast({
          title: "Nueva Empresa",
          description: `Se ha creado un nuevo conductor: ${data.nombre} ${data.nit}`,
          color: "success",
        });
      };

      const handleConductorActualizado = (data: Empresa) => {
        setSocketEventLogs((prev) => [
          ...prev,
          {
            eventName: "empresa:actualizado",
            data,
            timestamp: new Date(),
          },
        ]);

        addToast({
          title: "Empresa Actualizada",
          description: `Se ha actualizado la información de la empresa: ${data.nombre} ${data.nit}`,
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
