declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';

    interface AutoTableOptions {
        head: any[][]; // Encabezados de la tabla
        body: any[][]; // Cuerpo de la tabla
        startY?: number; // Posición Y opcional para iniciar la tabla
        margin?: { top?: number; left?: number; right?: number; bottom?: number }; // Márgenes opcionales
        theme?: 'grid' | 'striped' | 'plain' | 'header'; // Tema de la tabla
        styles?: {
            fontSize?: number; // Tamaño de fuente
            cellPadding?: number; // Espaciado interno de las celdas
            overflow?: 'linebreak' | 'ellipses' | 'hidden'; // Manejo del desbordamiento de texto
        };
        headStyles?: {
            fillColor?: [number, number, number]; // Color de fondo para el encabezado
            textColor?: [number, number, number]; // Color de texto para el encabezado
            fontStyle?: 'normal' | 'bold' | 'italic'; // Estilo de fuente para el encabezado
            // Otras propiedades opcionales
        };
        bodyStyles?: {
            fillColor?: [number, number, number]; // Color de fondo para el cuerpo
            textColor?: [number, number, number]; // Color de texto para el cuerpo
            // Otras propiedades opcionales
        };
        alternateRowStyles?: {
            fillColor?: [number, number, number]; // Color de fondo para filas alternas
            // Otras propiedades opcionales
        };
        // Agrega más opciones según sea necesario
    }

    export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
