"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { PlusIcon } from "lucide-react";
import { Alert } from "@heroui/alert";

import {
  Empresa,
  useEmpresa,
  BusquedaParams,
} from "@/context/EmpresaContext";
import ConductoresTable from "@/components/ui/table";
import { SortDescriptor } from "@/components/ui/customTable";
import ModalForm from "@/components/ui/modalForm";
// import ModalDetalleConductor from "@/components/ui/modalDetalle";
import BuscadorFiltrosConductores, {
  FilterOptions,
} from "@/components/ui/buscadorFiltros";

export default function GestionConductores() {
  const {
    empresasState,
    fetchEmpresas,
    createEmpresa,
    updateEmpresa,
  } = useEmpresa();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "nombre",
    direction: "ascending",
  });

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtros, setFiltros] = useState<FilterOptions>({
    sedes: [],
    tiposIdentificacion: [],
    tiposContrato: [],
    estados: [],
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Estados para los modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(
    null,
  );
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [conductorParaEditar, setConductorParaEditar] =
    useState<Empresa | null>(null);

  // Inicialización: cargar conductores
  useEffect(() => {
    cargarConductores();
  }, []);

  /// Función para cargar conductores con parámetros de búsqueda/filtros
  const cargarConductores = async (
    page: number = 1,
    searchTermParam?: string,
    filtrosParam?: FilterOptions,
  ) => {
    setLoading(true);

    try {
      // Usar parámetros proporcionados o valores de estado actuales
      const currentSearchTerm =
        searchTermParam !== undefined ? searchTermParam : searchTerm;
      const currentFiltros =
        filtrosParam !== undefined ? filtrosParam : filtros;

      // Construir parámetros de búsqueda
      const params: BusquedaParams = {
        page,
        sort: sortDescriptor.column,
        order: sortDescriptor.direction === "ascending" ? "ASC" : "DESC",
      };

      // Añadir término de búsqueda
      if (currentSearchTerm) {
        params.search = currentSearchTerm;
      }

      // Realizar la búsqueda
      await fetchEmpresas(params);

      // Actualizar los estados después de la búsqueda exitosa
      if (searchTermParam !== undefined) setSearchTerm(searchTermParam);
      if (filtrosParam !== undefined) setFiltros(filtrosParam);
    } catch (error) {
      console.error("Error al cargar conductores:", error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar la búsqueda
  const handleSearch = async (termino: string) => {
    await cargarConductores(1, termino, undefined);
  };

  // Manejar los filtros
  const handleFilter = async (nuevosFiltros: FilterOptions) => {
    await cargarConductores(1, undefined, nuevosFiltros);
  };

  // Manejar reset de búsqueda y filtros
  const handleReset = async () => {
    const filtrosVacios = {
      sedes: [],
      tiposIdentificacion: [],
      tiposContrato: [],
      estados: [],
    };

    await cargarConductores(1, "", filtrosVacios);
  };

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    cargarConductores(page);
  };

  // Manejar cambio de ordenamiento
  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    cargarConductores(1); // Volver a la primera página con el nuevo ordenamiento
  };

  // Manejar la selección de conductores
  const handleSelectItem = (conductor: Empresa) => {
    if (selectedIds.includes(conductor.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== conductor.id));
    } else {
      setSelectedIds([...selectedIds, conductor.id]);
    }
  };

  // Funciones para el modal de detalle
  const abrirModalDetalle = (id: string) => {
    setSelectedConductorId(id);
    setModalDetalleOpen(true);
  };

  // Funciones para el modal de formulario (crear/editar)
  const abrirModalCrear = () => {
    setConductorParaEditar(null);
    setModalFormOpen(true);
  };

  const abrirModalEditar = (conductor: Empresa) => {
    setConductorParaEditar(conductor);
    setModalFormOpen(true);
  };

  const cerrarModalForm = () => {
    setModalFormOpen(false);
    setConductorParaEditar(null);
  };

  const cerrarModalDetalle = () => {
    setModalDetalleOpen(false);
    setSelectedConductorId(null);
  };

  // Función para guardar conductor (nueva o editada)
  const guardarConductor = async (conductorData: Empresa) => {
    try {
      setLoading(true);
      if (conductorData.id) {
        // Editar conductor existente
        await updateEmpresa(conductorData.id, conductorData);
      } else {
        // Crear nuevo conductor
        await createEmpresa(conductorData);
      }

      // Si llegamos aquí, significa que la operación fue exitosa
      // Cerrar modal después de guardar correctamente
      cerrarModalForm();

      // Recargar la lista de conductores con los filtros actuales
      await cargarConductores(empresasState.currentPage);
    } catch (error) {
      // Si hay un error, no hacemos nada aquí ya que los errores ya son manejados
      console.log(
        "Error al guardar el conductor, el modal permanece abierto:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-5 sm:p-10 space-y-5">
      <div className="flex gap-3 flex-col sm:flex-row w-full items-start md:items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">
          Gestión de Conductores
        </h1>
        <Button
          className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          color="primary"
          isDisabled={loading}
          radius="sm"
          startContent={<PlusIcon />}
          onPress={abrirModalCrear}
        >
          Nuevo Empresa
        </Button>
      </div>
      <Alert
        className="py-2"
        color="success"
        radius="sm"
        title="Obteniendo cambios en tiempo real"
        variant="faded"
      />

      {/* Componente de búsqueda y filtros */}
      <BuscadorFiltrosConductores
        onFilter={handleFilter}
        onReset={handleReset}
        onSearch={handleSearch}
      />

      {/* Información sobre resultados filtrados */}
      {(searchTerm || Object.values(filtros).some((f) => f.length > 0)) && (
        <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm">
          Mostrando {empresasState.data.length} resultado(s) de{" "}
          {empresasState.count} conductor(es) total(es)
          {searchTerm && <span> - Búsqueda: {searchTerm}</span>}
        </div>
      )}

      {/* Tabla de conductores con paginación */}
      <ConductoresTable
        abrirModalDetalle={abrirModalDetalle}
        abrirModalEditar={abrirModalEditar}
        currentItems={empresasState.data}
        isLoading={loading}
        selectedIds={selectedIds}
        sortDescriptor={sortDescriptor}
        totalCount={empresasState.count}
        totalPages={empresasState.totalPages}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        onSelectItem={handleSelectItem}
        // Propiedades de paginación
        currentPage={empresasState.currentPage}
      />

      {/* Modal de formulario (crear/editar)
      <ModalForm
        conductorEditar={conductorParaEditar}
        isOpen={modalFormOpen}
        titulo={
          conductorParaEditar ? "Editar Empresa" : "Registrar Nuevo Empresa"
        }
        onClose={cerrarModalForm}
        onSave={guardarConductor}
      /> */}

      {/* Modal de detalle */}
      {/* <ModalDetalleConductor
        conductor={
          empresasState.data.find(
            (conductor) => conductor.id === selectedConductorId,
          ) || null
        }
        isOpen={modalDetalleOpen}
        onClose={cerrarModalDetalle}
        onEdit={() => {
          setModalDetalleOpen(false);
          setModalFormOpen(true);
          setConductorParaEditar(
            empresasState.data.find(
              (conductor) => conductor.id === selectedConductorId,
            ) || null,
          );
        }}
      /> */}
    </div>
  );
}
