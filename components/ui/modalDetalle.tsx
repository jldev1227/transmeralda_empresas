import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import {
  BuildingIcon,
  Edit,
  EditIcon
} from "lucide-react";

import {
  Empresa,
} from "@/context/EmpresaContext";

interface ModalDetalleEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa | null;
  onEdit?: () => void;
  abrirModalEditar: (id: string) => void;
}

const ModalDetalleEmpresa: React.FC<ModalDetalleEmpresaProps> = ({
  isOpen,
  onClose,
  empresa,
  onEdit,
}) => {
  if (!empresa) return null;

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => {
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
                {empresa ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Nombre</p>
                        <p className="font-medium">{empresa.Nombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">NIT</p>
                        <p className="font-medium">
                          {empresa.NIT
                            ? Number(empresa.NIT.replace(/\D/g, '')).toLocaleString('es-CO')
                            : "N/A"}
                        </p>
                      </div>
                      {empresa.Cedula && (
                        <div>
                          <p className="text-sm text-gray-500">Cédula</p>
                          <p className="font-medium">{empresa.Cedula}</p>
                        </div>
                      )}
                      {empresa.Direccion && (
                        <div>
                          <p className="text-sm text-gray-500">Dirección</p>
                          <p className="font-medium">{empresa.Direccion}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Requiere OSI</p>
                        <p className="font-medium">{empresa.requiere_osi ? "Sí" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Paga Recargos</p>
                        <p className="font-medium">{empresa.paga_recargos ? "Sí" : "No"}</p>
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
                {/* Botón de editar (opcional) */}
                {onEdit && (
                  <Button
                    color="primary"
                    radius="sm"
                    startContent={<Edit className="h-4 w-4" />}
                    variant="solid"
                    onPress={onEdit}
                  >
                    Editar Empresa
                  </Button>
                )}
              </ModalFooter>
            </>
          );
        }}
      </ModalContent>
    </Modal >
  );
};

export default ModalDetalleEmpresa;
