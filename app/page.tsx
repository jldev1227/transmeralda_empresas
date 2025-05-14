"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Pagination } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import {
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  BuildingIcon,
  XIcon,
  PlusIcon,
  EditIcon,
  CheckIcon,
  XCircleIcon,
} from "lucide-react";
import { useMediaQuery } from "react-responsive";
import CustomTable, { SortDescriptor } from "@/components/ui/customTable";
import { Empresa, useEmpresa } from "@/context/EmpresaContext";
import { KeyboardEvent } from 'react';
import ModalForm from "@/components/ui/modalForm";

const GestionEmpresas = () => {
  // Responsive breakpoints
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const isTablet = useMediaQuery({ minWidth: 641, maxWidth: 1024 });

  // Estados para la tabla y paginación
  const { empresas, createEmpresa, updateEmpresa } = useEmpresa();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroRequiereOSI, setFiltroRequiereOSI] = useState<boolean | null>(null);
  const [filtroPagaRecargos, setFiltroPagaRecargos] = useState<boolean | null>(null);

  const [selectedEmpresas, setSelectedEmpresas] = useState<Empresa[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
  const [displayedEmpresas, setDisplayedEmpresas] = useState<Empresa[]>([]);

  // Estado para ordenamiento
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "Nombre",
    direction: "ascending",
  });

  // Estados para los modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  
  // Estados para el modal de formulario (crear/editar)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [empresaParaEditar, setEmpresaParaEditar] = useState<Empresa | null>(null);

  // Aplicar filtros y ordenamiento localmente
  const applyFiltersAndSort = useCallback(() => {
    if (!empresas || empresas.length === 0) return;

    let filtered = [...empresas];

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter((empresa) =>
        empresa.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.NIT.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Aplicar filtro de requiere_osi
    if (filtroRequiereOSI !== null) {
      filtered = filtered.filter((empresa) =>
        empresa.requiere_osi === filtroRequiereOSI
      );
    }

    // Aplicar filtro de paga_recargos
    if (filtroPagaRecargos !== null) {
      filtered = filtered.filter((empresa) =>
        empresa.paga_recargos === filtroPagaRecargos
      );
    }

    // Aplicar ordenamiento
    const column = sortDescriptor.column;
    const direction = sortDescriptor.direction;

    filtered.sort((a, b) => {
      const valueA = a[column as keyof Empresa];
      const valueB = b[column as keyof Empresa];

      // Manejar casos donde los valores son null o undefined
      if (valueA === null || valueA === undefined) {
        return direction === "ascending" ? -1 : 1; // Valores nulos al principio o al final
      }
      if (valueB === null || valueB === undefined) {
        return direction === "ascending" ? 1 : -1; // Dependiendo de cómo quieras ordenar los nulos
      }

      // Para valores string, usamos localCompare
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction === "ascending"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Para valores booleanos o numéricos
      if (direction === "ascending") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    // Guardar resultados filtrados
    setFilteredEmpresas(filtered);
    setTotalResults(filtered.length);

    // Calcular paginación
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    setTotalPages(totalPages || 1);

    // Aplicar paginación
    const start = (page - 1) * ITEMS_PER_PAGE;
    const paginatedData = filtered.slice(start, start + ITEMS_PER_PAGE);
    setDisplayedEmpresas(paginatedData);

  }, [empresas, searchTerm, filtroRequiereOSI, filtroPagaRecargos, sortDescriptor, page]);

  // Inicializar datos cuando cambia empresas
  useEffect(() => {
    if (empresas && empresas.length > 0) {
      setLoading(false);
      applyFiltersAndSort();
    } else {
      setLoading(true);
    }
  }, [empresas]);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    applyFiltersAndSort();
  }, [
    page,
    searchTerm,
    filtroRequiereOSI,
    filtroPagaRecargos,
    sortDescriptor,
    applyFiltersAndSort,
  ]);

  // Manejar búsqueda
  const handleSearch = () => {
    setPage(1);
    // La actualización de filtrados se maneja en el useEffect
  };

  const handleSearchKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Resetear filtros
  const resetearFiltros = () => {
    setSearchTerm("");
    setFiltroRequiereOSI(null);
    setFiltroPagaRecargos(null);
    setPage(1);
    // La actualización de filtrados se maneja en el useEffect
  };

  // Manejar cambio de ordenamiento
  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    // La actualización del ordenamiento se maneja en el useEffect
  };

  // Funciones para el modal de detalle
  const abrirModalDetalle = (id: string) => {
    setSelectedEmpresaId(id);
    setModalDetalleOpen(true);
  };

  const cerrarModalDetalle = () => {
    setModalDetalleOpen(false);
    setSelectedEmpresaId(null);
  };

  // Funciones para el modal de formulario (crear/editar)
  const abrirModalCrear = () => {
    setEmpresaParaEditar(null);
    setModalFormOpen(true);
  };

  const abrirModalEditar = (empresa: Empresa) => {
    setEmpresaParaEditar(empresa);
    setModalFormOpen(true);
  };

  const cerrarModalForm = () => {
    setModalFormOpen(false);
    setEmpresaParaEditar(null);
  };

  // Función para guardar empresa (nueva o editada)
 const guardarEmpresa = async (empresaData: Empresa) => {
  try {
    if (empresaData.id) {
      // Editar empresa existente
      await updateEmpresa(empresaData.id, empresaData);
    } else {
      // Crear nueva empresa
      await createEmpresa(empresaData);
    }

    // Si llegamos aquí, significa que la operación fue exitosa
    // Cerrar modal después de guardar correctamente
    cerrarModalForm();
    
  } catch (error) {
    // Si hay un error, no hacemos nada aquí ya que los errores ya son manejados
    // en las funciones createEmpresa y updateEmpresa con addToast
    
    // No cerramos el modal para que el usuario pueda corregir los datos
    console.log("Error al guardar la empresa, el modal permanece abierto:", error);
    
    // Opcionalmente, puedes agregar un mensaje adicional para el usuario
    // indicando que debe corregir los errores para continuar
  }
};

  // Renderizar chip de booleano
  const renderBooleanChip = (value: boolean) => {
    const color = value ? "success" : "danger";
    const text = value ? "Sí" : "No";
    const icon = value ? <CheckIcon className="h-3 w-3 mr-1" /> : <XCircleIcon className="h-3 w-3 mr-1" />;

    return (
      <Chip color={color} size="sm" variant="flat">
        <div className="flex items-center">
          {icon}
          {text}
        </div>
      </Chip>
    );
  };

  // Formatear NIT
  const formatearNIT = (nit: string) => {
    if (!nit) return "N/A";

    return Number(nit.replace(/\D/g, '')).toLocaleString('es-CO');
  };

  // Determinar las columnas a mostrar según el tamaño de pantalla
  const columnasVisibles = useMemo(() => {
    if (isMobile) {
      // En móvil solo mostramos las columnas más importantes
      return ["Nombre", "NIT"];
    } else if (isTablet) {
      // En tablet mostramos más columnas
      return ["Nombre", "NIT"];
    } else {
      // En desktop mostramos todas
      return [
        "Nombre",
        "NIT",
        "requiere_osi",
        "paga_recargos"
      ];
    }
  }, [isMobile, isTablet]);

  // Renderizar el contenido de la celda basado en su tipo
  const renderCellContent = (empresa: Empresa, columnKey: string) => {
    switch (columnKey) {
      case "Nombre":
        return (
          <div className="font-semibold flex flex-col">
            <span>{empresa.Nombre}</span>
            {isMobile && (
              <span className="text-xs text-gray-500">
                NIT: {formatearNIT(empresa.NIT)}
              </span>
            )}
          </div>
        );
      case "NIT":
        return formatearNIT(empresa.NIT);
      case "requiere_osi":
        return renderBooleanChip(empresa.requiere_osi);
      case "paga_recargos":
        return renderBooleanChip(empresa.paga_recargos);
      default:
        return null;
    }
  };

  // Map de nombres de columnas para mostrar
  const columnNames = {
    Nombre: "EMPRESA",
    NIT: "NIT",
    requiere_osi: "REQUIERE OSI",
    paga_recargos: "PAGA RECARGOS"
  };

  return (
    <div className="container mx-auto p-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex gap-3 flex-col sm:flex-row w-full items-start md:items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">
            Gestión de Empresas
          </h1>
          <Button
            className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
            color="primary"
            radius="sm"
            startContent={<PlusIcon />}
            onPress={abrirModalCrear}
          >
            Nueva Empresa
          </Button>
        </div>
      </div>
      {/* Panel de filtros (siempre visible) */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        {/* Barra de búsqueda y botones principales */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-grow">
            <Input
              fullWidth
              placeholder="Buscar por nombre o NIT..."
              radius="sm"
              startContent={<SearchIcon className="h-4 w-4 text-gray-400" />}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyPress}
            />
          </div>
          {(searchTerm ||
            filtroRequiereOSI !== null ||
            filtroPagaRecargos !== null) && (
              <Button
                className="sm:w-auto"
                color="danger"
                startContent={<XIcon className="h-4 w-4" />}
                variant="light"
                onPress={resetearFiltros}
              >
                Limpiar filtros
              </Button>
            )}
        </div>
        {/* Filtros avanzados (siempre visibles) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Filtro por requiere_osi */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="requiere_osi"
            >
              Requiere OSI
            </label>
            <Dropdown id="requiere_osi">
              <DropdownTrigger>
                <Button
                  className="w-full justify-between"
                  endContent={<ChevronDownIcon className="h-4 w-4" />}
                  radius="sm"
                  variant="bordered"
                >
                  <div className="flex items-center">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    {filtroRequiereOSI === null
                      ? "Todos"
                      : filtroRequiereOSI
                        ? "Sí"
                        : "No"}
                  </div>
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Requiere OSI"
                onAction={(key) => {
                  if (key === "todos") {
                    setFiltroRequiereOSI(null);
                  } else if (key === "si") {
                    setFiltroRequiereOSI(true);
                  } else {
                    setFiltroRequiereOSI(false);
                  }
                }}
              >
                <DropdownItem key="todos">Todos</DropdownItem>
                <DropdownItem key="si">Sí</DropdownItem>
                <DropdownItem key="no">No</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          {/* Filtro por paga_recargos */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="paga_recargos"
            >
              Paga Recargos
            </label>
            <Dropdown id="paga_recargos">
              <DropdownTrigger>
                <Button
                  className="w-full justify-between"
                  endContent={<ChevronDownIcon className="h-4 w-4" />}
                  radius="sm"
                  variant="bordered"
                >
                  <div className="flex items-center">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    {filtroPagaRecargos === null
                      ? "Todos"
                      : filtroPagaRecargos
                        ? "Sí"
                        : "No"}
                  </div>
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Paga Recargos"
                onAction={(key) => {
                  if (key === "todos") {
                    setFiltroPagaRecargos(null);
                  } else if (key === "si") {
                    setFiltroPagaRecargos(true);
                  } else {
                    setFiltroPagaRecargos(false);
                  }
                }}
              >
                <DropdownItem key="todos">Todos</DropdownItem>
                <DropdownItem key="si">Sí</DropdownItem>
                <DropdownItem key="no">No</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
      {/* Contador de resultados */}
      {!loading && (
        <div className="text-sm text-gray-600 mb-2">
          {totalResults}{" "}
          {totalResults === 1
            ? "empresa encontrada"
            : "empresas encontradas"}
        </div>
      )}
      {/* Tabla de empresas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {useMemo(() => {
          // Definir las columnas para la tabla personalizada
          const tableColumns = columnasVisibles.map((columnKey) => ({
            key: columnKey,
            label: columnNames[columnKey as keyof typeof columnNames],
            renderCell: (empresa: Empresa) => renderCellContent(empresa, columnKey),
          }));
          
          // Añadir la columna de acciones
          tableColumns.push({
            key: "acciones",
            label: "ACCIONES",
            renderCell: (empresa) => (
              <div className="flex items-center space-x-2">
                <Button
                  color="primary"
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => {
                    abrirModalEditar(empresa);
                  }}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
              </div>
            ),
          });

          return (
            <CustomTable
              className="rounded-t-lg"
              columns={tableColumns}
              data={displayedEmpresas}
              emptyContent={
                error ? (
                  <div className="text-center p-4 text-red-500">{error}</div>
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    No se encontraron empresas con los filtros
                    seleccionados
                  </div>
                )
              }
              isLoading={loading}
              loadingContent={
                <div className="flex justify-center p-4">
                  <Spinner color="success" size="lg" />
                </div>
              }
              selectedItems={selectedEmpresas}
              sortDescriptor={sortDescriptor}
              onRowClick={(empresa) => abrirModalDetalle(empresa.id)}
              onSortChange={handleSortChange}
            />
          );
        }, [
          columnasVisibles,
          displayedEmpresas,
          selectedEmpresas,
          sortDescriptor,
          loading,
          error,
        ])}
        {/* Paginación */}
        {!loading && filteredEmpresas.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-4">
            <div className="text-sm text-gray-500 mb-2 sm:mb-0">
              Mostrando {displayedEmpresas.length === 0 ? 0 : (page - 1) * 10 + 1} a{" "}
              {Math.min(page * 10, filteredEmpresas.length)} de{" "}
              {filteredEmpresas.length} resultados
            </div>
            <Pagination
              showControls
              classNames={{
                cursor: "bg-emerald-600 text-white",
              }}
              color="success"
              page={page}
              radius="sm"
              total={totalPages}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modal de formulario (crear/editar) */}
      <ModalForm
        isOpen={modalFormOpen}
        onClose={cerrarModalForm}
        onSave={guardarEmpresa}
        empresaEditar={empresaParaEditar}
        titulo={empresaParaEditar ? "Editar Empresa" : "Registrar Nueva Empresa"}
      />

      {/* Modal de detalle de empresa */}
      <Modal
        backdrop="blur"
        isOpen={modalDetalleOpen}
        size="2xl"
        onClose={cerrarModalDetalle}
      >
        <ModalContent>
          {(onClose) => {
            // Encontrar la empresa seleccionada
            const empresaSeleccionada = empresas?.find(
              (emp) => emp.id === selectedEmpresaId
            );

            return (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <BuildingIcon className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold">
                      Detalle de Empresa
                    </h3>
                  </div>
                </ModalHeader>
                <ModalBody>
                  {empresaSeleccionada ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Nombre</p>
                          <p className="font-medium">{empresaSeleccionada.Nombre}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">NIT</p>
                          <p className="font-medium">
                            {empresaSeleccionada.NIT
                              ? Number(empresaSeleccionada.NIT.replace(/\D/g, '')).toLocaleString('es-CO')
                              : "N/A"}
                          </p>
                        </div>
                        {empresaSeleccionada.Cedula && (
                          <div>
                            <p className="text-sm text-gray-500">Cédula</p>
                            <p className="font-medium">{empresaSeleccionada.Cedula}</p>
                          </div>
                        )}
                        {empresaSeleccionada.Direccion && (
                          <div>
                            <p className="text-sm text-gray-500">Dirección</p>
                            <p className="font-medium">{empresaSeleccionada.Direccion}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Requiere OSI</p>
                          <p className="font-medium">{empresaSeleccionada.requiere_osi ? "Sí" : "No"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Paga Recargos</p>
                          <p className="font-medium">{empresaSeleccionada.paga_recargos ? "Sí" : "No"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <Spinner color="success" size="lg" />
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button
                    color="danger"
                    radius="sm"
                    variant="light"
                    onPress={onClose}
                  >
                    Cerrar
                  </Button>
                  <Button
                    color="primary"
                    radius="sm"
                    startContent={<EditIcon className="h-4 w-4" />}
                    onPress={() => {
                      // Cerrar modal de detalle
                      onClose();
                      // Abrir modal de edición con la empresa seleccionada
                      if (empresaSeleccionada) {
                        abrirModalEditar(empresaSeleccionada);
                      }
                    }}
                  >
                    Editar Empresa
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default GestionEmpresas;