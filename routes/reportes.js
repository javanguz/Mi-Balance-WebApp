// routes/reportes.js

const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const Consultas = require('../db/consultas');

module.exports = function(requireLicense) {
    // Helper para asegurar que un valor sea un array
    const ensureArray = (value) => {
        if (Array.isArray(value)) return value;
        if (value) return [value];
        return [];
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    function addPdfHeader(doc, username) {
        const range = doc.bufferedPageRange();
        
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const y = doc.page.margins.top / 2 - 10;
            const pageThird = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 3;
            doc.fontSize(8).fillColor('grey');
            doc.text(
                `Emitido: ${new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', hour12: false})}`,
                doc.page.margins.left, y, { align: 'left', width: pageThird }
            );
            if (username) {
                doc.text(
                    `Usuario: ${username}`,
                    doc.page.margins.left + pageThird, y, { align: 'center', width: pageThird }
                );
            }
            doc.text(
                `Página ${i + 1} de ${range.count}`,
                doc.page.margins.left + (pageThird * 2), y, { align: 'right', width: pageThird }
            );
        }
    }

    function formatCurrency(value) {
        const number = Number(value) || 0;
        const sign = number < 0 ? '- ' : '';
        const formattedNumber = new Intl.NumberFormat('es-AR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(number));
        return `${sign}${formattedNumber}`;
    }

    function drawHeaderInfo(doc, data, reportTitle) {
        doc.fontSize(16).text(reportTitle, { align: 'center' });
        doc.fontSize(10).text(`Período: ${formatDateForDisplay(data.periodo.desde)} al ${formatDateForDisplay(data.periodo.hasta)}`, { align: 'center' });
        doc.moveDown(1.5);
        const startX = doc.page.margins.left;
        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const initialY = doc.y;
        let currentY = initialY;
        let columnX = startX;
        doc.fontSize(9);
        if (data.tipo !== 'egreso') {
            doc.font('Helvetica-Bold').text('Total Ingresos:', columnX, currentY, { continued: true });
            doc.font('Helvetica').text(` ${formatCurrency(data.totalIngresos)}`);
            currentY += 15;
        }
        if (data.tipo !== 'ingreso') {
            doc.font('Helvetica-Bold').text('Total Egresos:', columnX, currentY, { continued: true });
            doc.font('Helvetica').text(` ${formatCurrency(-data.totalEgresos)}`);
            currentY += 15;
        }
        if (data.tipo === 'todos') {
            doc.font('Helvetica-Bold').text('Resultado del Período:', columnX, currentY, { continued: true });
            doc.font('Helvetica').text(` ${formatCurrency(data.resultado)}`);
        }
        if (Object.keys(data.filtrosAplicados).length > 0) {
            columnX = startX + contentWidth / 2;
            currentY = initialY;
            doc.font('Helvetica-Bold').text('Filtros Aplicados:', columnX, currentY);
            currentY += 15;
            doc.font('Helvetica');
            for (const [key, value] of Object.entries(data.filtrosAplicados)) {
                const text = `${key}: ${value}`;
                doc.text(text, columnX, currentY, { width: contentWidth / 2 - 20 });
                const textHeight = doc.heightOfString(text, { width: contentWidth / 2 - 20 });
                currentY += textHeight + 2;
            }
        }
        doc.y = Math.max(currentY, doc.y);
        doc.moveDown(2);
    }

    // ... (The rest of the helper functions: getHeaderDataAsArray, drawPdfResumenRow, procesarResumen, getReportData)
    // These functions do not need to be changed as they are pure data processing functions.

    function getHeaderDataAsArray(data) {
        const headerData = [[]];
        if (data.tipo !== 'egreso') {
            headerData.push(['Total Ingresos:', Number(data.totalIngresos)]);
        }
        if (data.tipo !== 'ingreso') {
            headerData.push(['Total Egresos:', Number(-data.totalEgresos)]);
        }
        if (data.tipo === 'todos') {
            headerData.push(['Resultado del Período:', Number(data.resultado)]);
        }
        headerData.push([]);
        if (Object.keys(data.filtrosAplicados).length > 0) {
            headerData.push(['Filtros Aplicados:']);
            for (const [key, value] of Object.entries(data.filtrosAplicados)) {
                headerData.push([`${key}:`, value]);
            }
            headerData.push([]);
        }
        return headerData;
    }
    
    function drawPdfResumenRow(doc, items, level, config) {
        const { isAllTypes, colWidths, startX, drawHeader, tipo, margins } = config;
        items.forEach(item => {
            if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
                doc.addPage({ margins: margins });
                drawHeader(doc.y);
            }
            const y = doc.y;
            let x = startX;
            const indentation = ' '.repeat(level * 4);
            const font = level === 1 ? 'Helvetica-Bold' : (level === 2 ? 'Helvetica' : 'Helvetica-Oblique');
            const fontSize = 10 - (level * 0.5);
            doc.fontSize(fontSize).font(font);
            doc.text(indentation + item.clave, x, y + 5, { width: colWidths[0] });
            x += colWidths[0];
            if (isAllTypes) {
                doc.text(formatCurrency(item.ingresos), x, y + 5, { width: colWidths[1], align: 'right' });
                x += colWidths[1];
                doc.text(formatCurrency(-item.egresos), x, y + 5, { width: colWidths[2], align: 'right' });
                x += colWidths[2];
                doc.text(formatCurrency(item.resultado), x, y + 5, { width: colWidths[3], align: 'right' });
            } else {
                const amount = tipo === 'ingreso' ? item.ingresos : -item.egresos;
                doc.text(formatCurrency(amount), x, y + 5, { width: colWidths[1], align: 'right' });
            }
            doc.y = y + doc.heightOfString(item.clave, { width: colWidths[0] }) + 5;
            const lineY = doc.y + 2;
            const strokeColor = level === 1 ? "#807a7d" : "#dddddd";
            const lineWidth = level === 1 ? 0.8 : 0.5;
            doc.strokeColor(strokeColor).lineWidth(lineWidth).moveTo(startX, lineY).lineTo(startX + colWidths.reduce((a, b) => a + b), lineY).stroke().lineWidth(1);
            doc.moveDown(0.5);
            if (item.subgrupos && item.subgrupos.length > 0) {
                drawPdfResumenRow(doc, item.subgrupos, level + 1, config);
            }
        });
    }

    function procesarResumen(movimientos, niveles) {
        if (!niveles || niveles.length === 0) {
            return [];
        }
        const getWeekNumber = (d) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        };
        const agrupar = (movs, nivelActual) => {
            if (!movs || movs.length === 0) {
                return [];
            }
            const grupos = movs.reduce((acc, mov) => {
                let clave;
                let sortKey;

                switch (nivelActual) {
                    case 'mensual':
                        const dateMensual = new Date(mov.fecha + 'T00:00:00');
                        const yearMensual = dateMensual.getFullYear();
                        const monthNumber = (dateMensual.getMonth() + 1).toString().padStart(2, '0');
                        let monthName = dateMensual.toLocaleString('es-AR', { month: 'long' });
                        monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        clave = `${yearMensual}-${monthName}`;
                        sortKey = `${yearMensual}-${monthNumber}`;
                        break;
                    case 'semanal':
                        const dateSemanal = new Date(mov.fecha + 'T00:00:00');
                        const yearSemanal = dateSemanal.getFullYear();
                        const week = getWeekNumber(dateSemanal);
                        clave = `${yearSemanal}-Semana.${String(week).padStart(2, '0')}`;
                        sortKey = clave;
                        break;
                    case 'categoria':
                        clave = mov.categoria_nombre || 'Sin categorizar';
                        sortKey = clave;
                        break;
                    case 'entidad':
                        clave = mov.entidad_nombre || 'General';
                        sortKey = clave;
                        break;
                    case 'modalidad':
                        clave = mov.modalidad || 'No especificada';
                        sortKey = clave;
                        break;
                    default:
                        clave = 'Desconocido';
                        sortKey = clave;
                }
                if (!acc[clave]) {
                    acc[clave] = { clave: clave, sortKey: sortKey, movimientos: [], ingresos: 0, egresos: 0, resultado: 0 };
                }
                acc[clave].movimientos.push(mov);
                if (mov.tipo === 'ingreso') {
                    acc[clave].ingresos += mov.monto;
                } else {
                    acc[clave].egresos += mov.monto;
                }
                acc[clave].resultado = acc[clave].ingresos - acc[clave].egresos;
                return acc;
            }, {});
            const resultadoArray = Object.values(grupos);
            const proximoNivel = niveles[niveles.indexOf(nivelActual) + 1];
            if (proximoNivel) {
                resultadoArray.forEach(grupo => {
                    grupo.subgrupos = agrupar(grupo.movimientos, proximoNivel);
                    delete grupo.movimientos;
                });
            } else {
                 resultadoArray.forEach(grupo => {
                    delete grupo.movimientos;
                });
            }
            return resultadoArray.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        };
        return agrupar(movimientos, niveles[0]);
    }
    
    async function getReportData(queryParams) {
        const {
            desde, hasta, tipo, invertir_orden,
            clientes, proveedores, modalidades, categorias,
            mostrar_comentarios,
            resumen_nivel_1, resumen_nivel_2, resumen_nivel_3
        } = queryParams;
        let sql = `
            SELECT 
                m.*, 
                COALESCE(cat.nombre, 'Sin categorizar') as categoria_nombre, 
                CASE 
                    WHEN m.entidad_tipo = 'cliente' THEN c.nombre 
                    WHEN m.entidad_tipo = 'proveedor' THEN p.nombre 
                    ELSE 'N/A' 
                END as entidad_nombre 
            FROM movimientos m 
            LEFT JOIN clientes c ON m.entidad_id = c.id AND m.entidad_tipo = 'cliente' 
            LEFT JOIN proveedores p ON m.entidad_id = p.id AND m.entidad_tipo = 'proveedor' 
            LEFT JOIN categorias cat ON m.categoria_id = cat.id
        `;
        const whereClauses = ['m.fecha BETWEEN ? AND ?'];
        const params = [desde, hasta];
        const filtrosAplicados = {};
        if (tipo && tipo !== 'todos') {
            whereClauses.push('m.tipo = ?');
            params.push(tipo);
            filtrosAplicados.tipo = tipo === 'ingreso' ? 'Solo Ingresos' : 'Solo Egresos';
        }
        const categoriasArr = ensureArray(categorias);
        if (categoriasArr.length > 0) {
            whereClauses.push(`m.categoria_id IN (${categoriasArr.map(() => '?').join(',')})`);
            params.push(...categoriasArr);
            const nombresResult = await Consultas.dbAllAsync(`SELECT nombre FROM categorias WHERE id IN (${categoriasArr.map(() => '?').join(',')})`, categoriasArr);
            if (nombresResult.length > 0) {
                filtrosAplicados['Categorías'] = nombresResult.map(c => c.nombre).join(', ');
            }
        }
        const modalidadesArr = ensureArray(modalidades);
        if (modalidadesArr.length > 0) {
            whereClauses.push(`m.modalidad IN (${modalidadesArr.map(() => '?').join(',')})`);
            params.push(...modalidadesArr);
            filtrosAplicados['Modalidades'] = modalidadesArr.join(', ');
        }
        const clientesArr = ensureArray(clientes);
        const proveedoresArr = ensureArray(proveedores);
        const entidadClauses = [];
        if (clientesArr.length > 0) {
            entidadClauses.push(`(m.entidad_tipo = 'cliente' AND m.entidad_id IN (${clientesArr.map(() => '?').join(',')}))`);
            params.push(...clientesArr);
            const nombresResult = await Consultas.dbAllAsync(`SELECT nombre FROM clientes WHERE id IN (${clientesArr.map(() => '?').join(',')})`, clientesArr);
            if (nombresResult.length > 0) {
                filtrosAplicados.Clientes = nombresResult.map(c => c.nombre).join(', ');
            }
        }
        if (proveedoresArr.length > 0) {
            entidadClauses.push(`(m.entidad_tipo = 'proveedor' AND m.entidad_id IN (${proveedoresArr.map(() => '?').join(',')}))`);
            params.push(...proveedoresArr);
            const nombresResult = await Consultas.dbAllAsync(`SELECT nombre FROM proveedores WHERE id IN (${proveedoresArr.map(() => '?').join(',')})`, proveedoresArr);
            if (nombresResult.length > 0) {
                filtrosAplicados.Proveedores = nombresResult.map(p => p.nombre).join(', ');
            }
        }
        if (entidadClauses.length > 0) {
            whereClauses.push(`(${entidadClauses.join(' OR ')})`);
        }
        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        const orden = invertir_orden ? 'ASC' : 'DESC';
        sql += ` ORDER BY m.fecha ${orden}, m.id ${orden}`;
        const movimientos = await Consultas.dbAllAsync(sql, params);
        const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
        const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
        let resultadosResumen = null;
        const nivelesResumen = [resumen_nivel_1, resumen_nivel_2, resumen_nivel_3].filter(Boolean);
        if (nivelesResumen.length > 0) {
            resultadosResumen = procesarResumen(movimientos, nivelesResumen);
        }
        return {
            movimientos, totalIngresos, totalEgresos, resultado: totalIngresos - totalEgresos,
            periodo: { desde, hasta }, tipo, orden, filtrosAplicados, mostrar_comentarios,
            resultadosResumen, nivelesResumen
        };
    }

    router.get('/', async (req, res, next) => {
        try {
            const [modalidades, categorias, clientes, proveedores] = await Promise.all([
                Consultas.getModalidadesUnicas(),
                Consultas.getCategorias(),
                Consultas.getClientes(),
                Consultas.getProveedores()
            ]);
            res.render('reportes', {
                title: 'Reportes',
                active_link: 'reportes',
                resultados: null,
                resultadosResumen: null,
                modalidades,
                categorias,
                clientes,
                proveedores,
                query: {}
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/generar', requireLicense, async (req, res, next) => {
        try {
            const { fecha_desde, fecha_hasta } = req.query;
            if (!fecha_desde || !fecha_hasta) {
                 return res.redirect('/reportes');
            }
            const data = await getReportData({
                desde: fecha_desde,
                hasta: fecha_hasta,
                tipo: req.query.tipo,
                invertir_orden: req.query.invertir_orden,
                clientes: req.query.clientes,
                proveedores: req.query.proveedores,
                modalidades: req.query.modalidad,
                categorias: req.query.categoria_id,
                mostrar_comentarios: req.query.mostrar_comentarios,
                resumen_nivel_1: req.query.resumen_nivel_1,
                resumen_nivel_2: req.query.resumen_nivel_2,
                resumen_nivel_3: req.query.resumen_nivel_3,
            });
            const [modalidades, categorias, clientes, proveedores] = await Promise.all([
                Consultas.getModalidadesUnicas(),
                Consultas.getCategorias(),
                Consultas.getClientes(),
                Consultas.getProveedores()
            ]);
            res.render('reportes', {
                title: 'Reportes',
                active_link: 'reportes',
                resultados: data,
                resultadosResumen: data.resultadosResumen,
                modalidades,
                categorias,
                clientes,
                proveedores,
                query: req.query
            });
        } catch (err) {
            next(err);
        }
    });

    router.post('/generar', requireLicense, (req, res) => {
        const params = new URLSearchParams();
        for (const key in req.body) {
            const value = req.body[key];
            if (Array.isArray(value)) {
                value.forEach(item => params.append(key, item));
            } else if (value) {
                params.append(key, value);
            }
        }
        res.redirect(`/reportes/generar?${params.toString()}`);
    });

    function generarPdfDetalle(res, data, username) {
        const margins = { top: 72, bottom: 72, left: 40, right: 40 };
        const doc = new PDFDocument({ layout: 'landscape', margins: margins, size: 'A4', bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_detalle.pdf');
        doc.pipe(res);
        drawHeaderInfo(doc, data, 'Reporte Detallado de Movimientos');
        const headers = ["Fecha", "Entidad", "Categoría", "Modalidad", "Importe"];
        const colWidths = [80, 250, 180, 100, 110];
        const tableWidth = colWidths.reduce((a, b) => a + b);
        const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const startX = doc.page.margins.left + (availableWidth - tableWidth) / 2;
        const drawHeader = (y) => {
            let x = startX;
            doc.fontSize(9).font('Helvetica-Bold');
            headers.forEach((header, i) => {
                doc.text(header, x, y, { width: colWidths[i], align: i === 4 ? 'right' : 'left' });
                x += colWidths[i];
            });
            doc.moveTo(startX, y + 15).lineTo(startX + tableWidth, y + 15).stroke('#aaaaaa');
            doc.font('Helvetica');
        };
        drawHeader(doc.y);
        doc.moveDown(0.5);
        data.movimientos.forEach(m => {
            const estRowHeight = data.mostrar_comentarios && m.descripcion ? 40 : 20;
            if (doc.y > doc.page.height - doc.page.margins.bottom - estRowHeight) {
                doc.addPage({ layout: 'landscape', size: 'A4', margins: margins });
                drawHeader(doc.y);
                doc.moveDown(0.5);
            }
            let x = startX;
            const importeFinal = m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto);
            const row = [
                new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
                String(m.entidad_nombre || 'N/A'),
                String(m.categoria_nombre || 'N/A'),
                String(m.modalidad || ''),
                formatCurrency(importeFinal)
            ];
            const y = doc.y;
            doc.fontSize(9);
            row.forEach((cell, i) => {
                doc.text(cell, x, y, { width: colWidths[i], align: i === 4 ? 'right' : 'left' });
                x += colWidths[i];
            });
            const rowHeight = doc.y - y;
            let finalY = y + rowHeight;
            if (data.mostrar_comentarios && m.descripcion) {
                doc.font('Helvetica-Oblique').fontSize(8).fillColor('grey');
                doc.text(`↳ ${m.descripcion}`, startX + 10, doc.y, {
                    width: tableWidth - 20,
                    align: 'left'
                });
                doc.font('Helvetica').fontSize(9).fillColor('black');
                finalY = doc.y;
            }
            doc.moveTo(startX, finalY + 3).lineTo(startX + tableWidth, finalY + 3).stroke('#dddddd');
            doc.y = finalY + 5;
        });
        addPdfHeader(doc, username);
        doc.end();
    }
    
    function generarExcelDetalle(res, data) {
        const wb = xlsx.utils.book_new();
        const headerArray = getHeaderDataAsArray(data);
        const headers = ["Fecha", "Entidad", "Categoría", "Modalidad", "Importe"];
        if (data.mostrar_comentarios) {
            headers.push("Comentarios");
        }
        const ws_data = [
            ["Reporte Detallado"],
            [`Período: ${formatDateForDisplay(data.periodo.desde)} al ${formatDateForDisplay(data.periodo.hasta)}`],
            ...headerArray,
            headers
        ];
        const dataStartIndex = ws_data.length;
        data.movimientos.forEach(m => {
            const importeFinal = m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto);
            const [year, month, day] = m.fecha.split('-').map(Number);
            const fechaObjeto = new Date(Date.UTC(year, month - 1, day));
            const row = [
                fechaObjeto,
                m.entidad_nombre,
                m.categoria_nombre,
                m.modalidad,
                importeFinal
            ];
            if (data.mostrar_comentarios) {
                row.push(m.descripcion || '');
            }
            ws_data.push(row);
        });
        const ws = xlsx.utils.aoa_to_sheet(ws_data);
        const numberFormat = '#,##0.00';
        const dateFormat = 'dd/mm/yyyy';
        for (let i = dataStartIndex; i < ws_data.length; i++) {
            const dateCellRef = xlsx.utils.encode_cell({r: i, c: 0});
            if (ws[dateCellRef] && ws[dateCellRef].v instanceof Date) {
                ws[dateCellRef].t = 'd';
                ws[dateCellRef].z = dateFormat;
            }
            const amountCellRef = xlsx.utils.encode_cell({r: i, c: 4});
            if (ws[amountCellRef]) {
                ws[amountCellRef].t = 'n';
                ws[amountCellRef].z = numberFormat;
            }
        }
        headerArray.forEach((row, index) => {
            if(row.length > 1 && typeof row[1] === 'number') {
                const cellRef = xlsx.utils.encode_cell({r: index + 2, c: 1});
                 if(ws[cellRef]) {
                    ws[cellRef].t = 'n';
                    ws[cellRef].z = numberFormat;
                 }
            }
        });
        xlsx.utils.book_append_sheet(wb, ws, "Reporte Detallado");
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_detallado.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    }
    
    function generarPdfResumen(res, data, username) {
        const margins = { top: 72, bottom: 72, left: 40, right: 40 };
        const doc = new PDFDocument({ margins: margins, size: 'A4', bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_resumen.pdf');
        doc.pipe(res);
        drawHeaderInfo(doc, data, 'Reporte Resumido de Movimientos');
        const isAllTypes = data.tipo === 'todos';
        const headers = isAllTypes ? ['Concepto', 'Ingresos', 'Egresos', 'Resultado'] : ['Concepto', 'Importe'];
        const colWidths = isAllTypes ? [300, 80, 80, 80] : [400, 120];
        const tableWidth = colWidths.reduce((a, b) => a + b);
        const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const startX = doc.page.margins.left + (availableWidth - tableWidth) / 2;
        const drawHeader = (y) => {
            let x = startX;
            doc.fontSize(9).font('Helvetica-Bold');
            headers.forEach((header, i) => {
                doc.text(header, x, y, { width: colWidths[i], align: i > 0 ? 'right' : 'left' });
                x += colWidths[i];
            });
            doc.moveTo(startX, y + 12).lineTo(startX + tableWidth, y + 12).stroke('#aaaaaa');
            doc.font('Helvetica');
        };
        drawHeader(doc.y);
        const recursiveConfig = {
            isAllTypes, colWidths, startX, drawHeader, tipo: data.tipo, margins: margins
        };
        drawPdfResumenRow(doc, data.resultadosResumen, 1, recursiveConfig);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold');
        let x = startX;
        doc.text('Total del Período:', x, doc.y);
        x += colWidths[0];
        if (isAllTypes) {
            doc.text(formatCurrency(data.totalIngresos), x, doc.y, { width: colWidths[1], align: 'right' });
            x += colWidths[1];
            doc.text(formatCurrency(-data.totalEgresos), x, doc.y, { width: colWidths[2], align: 'right' });
            x += colWidths[2];
            doc.text(formatCurrency(data.resultado), x, doc.y, { width: colWidths[3], align: 'right' });
        } else {
            const totalAmount = data.tipo === 'ingreso' ? data.totalIngresos : -data.totalEgresos;
            doc.text(formatCurrency(totalAmount), x, doc.y, { width: colWidths[1], align: 'right' });
        }
        addPdfHeader(doc, username);
        doc.end();
    }
    
    function generarExcelResumen(res, data) {
        const wb = xlsx.utils.book_new();
        const isAllTypes = data.tipo === 'todos';
        const headers = isAllTypes ? ['Concepto', 'Ingresos', 'Egresos', 'Resultado'] : ['Concepto', 'Importe'];
        const headerArray = getHeaderDataAsArray(data);
        const ws_data = [
            ["Reporte Resumido"],
            [`Período: ${formatDateForDisplay(data.periodo.desde)} al ${formatDateForDisplay(data.periodo.hasta)}`],
            ...headerArray,
            headers
        ];
        const dataStartIndex = ws_data.length;
        const addRowsRecursive = (items, level) => {
            items.forEach(item => {
                const indentation = ' '.repeat(level * 4);
                let row = [indentation + item.clave];
                if (isAllTypes) {
                    row.push(Number(item.ingresos), Number(-item.egresos), Number(item.resultado));
                } else {
                    const amount = data.tipo === 'ingreso' ? item.ingresos : -item.egresos;
                    row.push(Number(amount));
                }
                ws_data.push(row);
                if (item.subgrupos) {
                    addRowsRecursive(item.subgrupos, level + 1);
                }
            });
        };
        addRowsRecursive(data.resultadosResumen, 1);
        ws_data.push([]);
        let totalRow = ['Total del Período:'];
        if (isAllTypes) {
            totalRow.push(Number(data.totalIngresos), Number(-data.totalEgresos), Number(data.resultado));
        } else {
            const totalAmount = data.tipo === 'ingreso' ? data.totalIngresos : -data.totalEgresos;
            totalRow.push(Number(totalAmount));
        }
        ws_data.push(totalRow);
        const ws = xlsx.utils.aoa_to_sheet(ws_data);
        const numberFormat = '#,##0.00';
        for (let i = dataStartIndex; i <= ws_data.length; i++) {
            for (let j = 1; j < headers.length; j++) {
                const cellRef = xlsx.utils.encode_cell({r: i - 1, c: j});
                if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
                    ws[cellRef].t = 'n';
                    ws[cellRef].z = numberFormat;
                }
            }
        }
        headerArray.forEach((row, index) => {
            if(row.length > 1 && typeof row[1] === 'number') {
                const cellRef = xlsx.utils.encode_cell({r: index + 2, c: 1});
                 if(ws[cellRef]) {
                    ws[cellRef].t = 'n';
                    ws[cellRef].z = numberFormat;
                 }
            }
        });
        xlsx.utils.book_append_sheet(wb, ws, "Resumen");
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_resumen.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    }

    router.get('/exportar/detalle/:formato', requireLicense, async (req, res, next) => {
        try {
            const { formato } = req.params;
            const data = await getReportData({
                desde: req.query.desde,
                hasta: req.query.hasta,
                tipo: req.query.tipo,
                invertir_orden: req.query.invertir_orden,
                clientes: req.query.clientes,
                proveedores: req.query.proveedores,
                modalidades: req.query.modalidad,
                categorias: req.query.categoria_id,
                mostrar_comentarios: req.query.mostrar_comentarios
            });
            if (formato === 'pdf') generarPdfDetalle(res, data, req.app.locals.username);
            else if (formato === 'excel') generarExcelDetalle(res, data);
            else res.status(400).send("Formato no válido");
        } catch (err) {
            next(err);
        }
    });

    router.get('/exportar/resumen/:formato', requireLicense, async (req, res, next) => {
        try {
            const { formato } = req.params;
            const data = await getReportData({
                desde: req.query.desde,
                hasta: req.query.hasta,
                tipo: req.query.tipo,
                clientes: req.query.clientes,
                proveedores: req.query.proveedores,
                modalidades: req.query.modalidad,
                categorias: req.query.categoria_id,
                resumen_nivel_1: req.query.resumen_nivel_1,
                resumen_nivel_2: req.query.resumen_nivel_2,
                resumen_nivel_3: req.query.resumen_nivel_3,
            });
            if (formato === 'pdf') generarPdfResumen(res, data, req.app.locals.username);
            else if (formato === 'excel') generarExcelResumen(res, data);
            else res.status(400).send("Formato no válido");
        } catch (err) {
            next(err);
        }
    });
    
    return router;
};
