import React, { useEffect, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal"; // Asegúrate de ajustar esta importación según la documentación de Hero UI
import {
    Button,
} from "@heroui/button"; // Asegúrate de ajustar esta importación según la documentación de Hero UI
import {
    Input
} from "@heroui/input"; // Asegúrate de ajustar esta importación según la documentación de Hero UI
import {
    Switch
} from "@heroui/switch"; // Asegúrate de ajustar esta importación según la documentación de Hero UI
import { BuildingIcon, SaveIcon } from "lucide-react"; // Importa los iconos que necesites
import { Empresa } from "@/context/EmpresaContext";

interface ModalFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (empresa: Empresa) => Promise<void>; // Cambiar a Promise<void>
    empresaEditar?: Empresa | null;
    titulo?: string;
}

const ModalForm: React.FC<ModalFormProps> = ({
    isOpen,
    onClose,
    onSave,
    empresaEditar = null,
    titulo = "Registrar Nueva Empresa"
}) => {
    // Estado para almacenar los datos del formulario
    const [formData, setFormData] = useState<Partial<Empresa>>({
        Nombre: "",
        NIT: "",
        requiere_osi: false,
        paga_recargos: false
    });

    // Estado para manejar la validación
    const [errores, setErrores] = useState({
        Nombre: false,
        NIT: false
    });

    // Efecto para cargar datos cuando se está editando
    useEffect(() => {
        if (empresaEditar) {
            setFormData({
                id: empresaEditar.id,
                Nombre: empresaEditar.Nombre || "",
                NIT: empresaEditar.NIT || "",
                requiere_osi: empresaEditar.requiere_osi || false,
                paga_recargos: empresaEditar.paga_recargos || false
            });
        } else {
            // Resetear el formulario si no hay empresa para editar
            setFormData({
                Nombre: "",
                NIT: "",
                requiere_osi: false,
                paga_recargos: false
            });
        }
    }, [empresaEditar, isOpen]);

    // Manejar cambios en los inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Limpiar error al escribir
        if (errores[name as keyof typeof errores]) {
            setErrores(prev => ({
                ...prev,
                [name]: false
            }));
        }
    };

    // Manejar cambios en los switches
    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    // Validar y guardar datos
    // Validar y guardar datos
    const handleSave = () => {
        // Validaciones con operador de encadenamiento opcional
        const nuevosErrores = {
            Nombre: !formData.Nombre?.trim(),
            NIT: !formData.NIT?.trim()
        };

        setErrores(nuevosErrores);

        // Si hay errores, no continuar
        if (nuevosErrores.Nombre || nuevosErrores.NIT) {
            return;
        }

        // Enviar datos
        onSave(formData as Empresa); // Cast necesario porque onSave espera un objeto Empresa completo
    };

    // Dar formato al NIT mientras se escribe (opcional)
    const formatearNIT = (nit: string) => {
        // Eliminar caracteres no numéricos
        const numeros = nit.replace(/\D/g, '');

        // Aplicar formato con puntos de miles si es necesario
        return numeros;

        // Opcionalmente, puedes aplicar formato mientras el usuario escribe
        // return numeros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center space-x-2">
                                <BuildingIcon className="h-5 w-5 text-emerald-600" />
                                <h3 className="text-lg font-semibold">
                                    {empresaEditar ? "Editar Empresa" : titulo}
                                </h3>
                            </div>
                        </ModalHeader>

                        <ModalBody>
                            <div className="space-y-4">
                                <Input
                                    label="Nombre de la Empresa"
                                    placeholder="Ingrese el nombre"
                                    name="Nombre"
                                    value={formData.Nombre}
                                    onChange={handleChange}
                                    isInvalid={errores.Nombre}
                                    errorMessage={errores.Nombre ? "El nombre es requerido" : ""}
                                    isRequired
                                />

                                <Input
                                    label="NIT"
                                    placeholder="Ingrese el NIT"
                                    name="NIT"
                                    value={formData.NIT}
                                    onChange={(e) => {
                                        const formatted = formatearNIT(e.target.value);
                                        setFormData(prev => ({
                                            ...prev,
                                            NIT: formatted
                                        }));

                                        // Limpiar error al escribir
                                        if (errores.NIT) {
                                            setErrores(prev => ({
                                                ...prev,
                                                NIT: false
                                            }));
                                        }
                                    }}
                                    isInvalid={errores.NIT}
                                    errorMessage={errores.NIT ? "El NIT es requerido" : ""}
                                    isRequired
                                />

                                <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:justify-between">
                                    <div className="flex items-center justify-between md:w-1/2">
                                        <span className="text-sm">¿Requiere OSI?</span>
                                        <Switch
                                            isSelected={formData.requiere_osi}
                                            onChange={(e) => handleSwitchChange("requiere_osi", e.target.checked)}
                                            color="success"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between md:w-1/2">
                                        <span className="text-sm">¿Paga Recargos?</span>
                                        <Switch
                                            isSelected={formData.paga_recargos}
                                            onChange={(e) => handleSwitchChange("paga_recargos", e.target.checked)}
                                            color="success"
                                        />
                                    </div>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <Button
                                color="danger"
                                variant="light"
                                radius="sm"
                                onPress={onClose}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                                startContent={<SaveIcon className="h-4 w-4" />}
                                onPress={handleSave}
                            >
                                {empresaEditar ? "Actualizar" : "Guardar"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default ModalForm;
