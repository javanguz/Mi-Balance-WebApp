// routes/inicio.js

const express = require('express');
const router = express.Router();
const Consultas = require('../db/consultas');
const { getISOWeek, getYear, isFuture, startOfMonth, startOfWeek, startOfYear, getWeekYear, subYears, subMonths, subWeeks, setISOWeek, setYear, startOfISOWeek } = require('date-fns');

/**
 * Devuelve el número de semana ISO estándar.
 * @param {Date} date - La fecha a evaluar.
 * @returns {number} - El número de semana ISO.
 */
const getWeekNumber = (date) => getISOWeek(date);

/**
 * Calcula toda la información necesaria para un período de tiempo específico,
 * incluyendo fechas, etiquetas y enlaces de navegación.
 * @param {object} query - El objeto de consulta de la solicitud (req.query).
 * @returns {object} - Un objeto con toda la información del período.
 */
const getPeriodInfo = (query) => {
    const view = query.view || 'mensual';
    const now = new Date();
    let year = parseInt(query.year) || getYear(now);
    let month = query.month ? parseInt(query.month) - 1 : now.getMonth();
    let week = parseInt(query.week) || getWeekNumber(now);

    let startDate, endDate, displayTitle, nav, ribbon = [];
    const currentYear = getYear(now);
    const currentMonth = now.getMonth();

    switch (view) {
        case 'anual':
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
            displayTitle = `Año ${year}`;
            
            const isNextYearDisabled = isFuture(startOfYear(new Date(year + 1, 0, 1)));
            nav = {
                prevLink: `/inicio?view=anual&year=${year - 1}`,
                nextLink: isNextYearDisabled ? '#' : `/inicio?view=anual&year=${year + 1}`,
                isNextDisabled: isNextYearDisabled
            };
            for (let i = -3; i <= 3; i++) {
                const y = year + i;
                const isItemFuture = isFuture(startOfYear(new Date(y, 0, 1)));
                const isCurrent = (y === currentYear);
                ribbon.push({
                    label: y.toString(),
                    subLabel: (isCurrent && i === 0) ? 'en curso' : null,
                    link: isItemFuture ? '#' : `/inicio?view=anual&year=${y}`,
                    isActive: i === 0,
                    isFuture: isItemFuture
                });
            }
            break;
        case 'mensual':
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0);
            displayTitle = startDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' }).replace(' de ', ' ').replace(/^\w/, c => c.toUpperCase());
            const prevMonth = new Date(year, month - 1, 1);
            const nextMonth = new Date(year, month + 1, 1);
            const isNextMonthDisabled = isFuture(startOfMonth(nextMonth));
            nav = {
                prevLink: `/inicio?view=mensual&year=${prevMonth.getFullYear()}&month=${prevMonth.getMonth() + 1}`,
                nextLink: isNextMonthDisabled ? '#' : `/inicio?view=mensual&year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth() + 1}`,
                isNextDisabled: isNextMonthDisabled
            };
            for (let i = -3; i <= 3; i++) {
                const d = new Date(year, month + i, 1);
                const isItemFuture = isFuture(startOfMonth(d));
                const isCurrent = (d.getFullYear() === currentYear && d.getMonth() === currentMonth);
                ribbon.push({
                    label: d.toLocaleString('es-AR', { month: 'short', year: '2-digit' }).replace('.', ''),
                    subLabel: (isCurrent && i === 0) ? 'en curso' : null,
                    link: isItemFuture ? '#' : `/inicio?view=mensual&year=${d.getFullYear()}&month=${d.getMonth() + 1}`,
                    isActive: i === 0,
                    isFuture: isItemFuture
                });
            }
            break;
        case 'semanal':
            const dateInWeek = setISOWeek(setYear(new Date(), year), week);
            startDate = startOfISOWeek(dateInWeek);
            
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            const displayWeek = getWeekNumber(startDate);
            const displayYear = getWeekYear(startDate, { weekStartsOn: 1 });
            displayTitle = `Semana ${displayWeek}, ${displayYear}`;
            const prevWeekDate = new Date(startDate);
            prevWeekDate.setDate(startDate.getDate() - 7);
            const nextWeekDate = new Date(startDate);
            nextWeekDate.setDate(startDate.getDate() + 7);
            const isNextWeekDisabled = isFuture(startOfWeek(nextWeekDate, { weekStartsOn: 1 }));
            nav = {
                prevLink: `/inicio?view=semanal&year=${getWeekYear(prevWeekDate, { weekStartsOn: 1 })}&week=${getWeekNumber(prevWeekDate)}`,
                nextLink: isNextWeekDisabled ? '#' : `/inicio?view=semanal&year=${getWeekYear(nextWeekDate, { weekStartsOn: 1 })}&week=${getWeekNumber(nextWeekDate)}`,
                isNextDisabled: isNextWeekDisabled
            };
            for (let i = -3; i <= 3; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + (i * 7));
                const weekStart = startOfISOWeek(d);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                const formatoFecha = { day: 'numeric', month: 'short' };
                const subLabel = `${weekStart.toLocaleDateString('es-AR', formatoFecha).replace('.', '')} - ${weekEnd.toLocaleDateString('es-AR', formatoFecha).replace('.', '')}`;
                const w = getWeekNumber(d);
                const y = getWeekYear(d, { weekStartsOn: 1 });
                const isItemFuture = isFuture(startOfWeek(d, { weekStartsOn: 1 }));
                ribbon.push({
                    label: `Sem ${w}`,
                    subLabel: subLabel,
                    link: isItemFuture ? '#' : `/inicio?view=semanal&year=${y}&week=${w}`,
                    isActive: i === 0,
                    isFuture: isItemFuture
                });
            }
            break;
    }

    return { view, startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10), displayTitle, nav, ribbon };
};

/**
 * Genera la información de los períodos para el gráfico histórico (actual y 11 anteriores).
 * @param {object} periodInfo - El objeto con la información del período actual.
 * @returns {Array} - Un array de objetos, cada uno representando un período para el gráfico.
 */
const getChartPeriods = (periodInfo) => {
    const { view, startDate } = periodInfo;
    const chartPeriods = [];
    const currentPeriodDate = new Date(startDate + 'T00:00:00');

    for (let i = 0; i >= -11; i--) {
        let periodDate;
        let link;
        let label;
        let isPeriodFuture = false;

        switch (view) {
            case 'anual':
                periodDate = subYears(currentPeriodDate, -i);
                const year = getYear(periodDate);
                label = year.toString();
                link = `/inicio?view=anual&year=${year}`;
                isPeriodFuture = isFuture(startOfYear(periodDate));
                break;
            case 'mensual':
                periodDate = subMonths(currentPeriodDate, -i);
                const month = periodDate.getMonth() + 1;
                const monthYear = periodDate.getFullYear();
                label = periodDate.toLocaleString('es-AR', { month: 'short', year: '2-digit' }).replace('.', '');
                link = `/inicio?view=mensual&year=${monthYear}&month=${month}`;
                isPeriodFuture = isFuture(startOfMonth(periodDate));
                break;
            case 'semanal':
                periodDate = subWeeks(currentPeriodDate, -i);
                const week = getWeekNumber(periodDate);
                const weekYear = getWeekYear(periodDate, { weekStartsOn: 1 });
                label = `Sem ${week}`;
                link = `/inicio?view=semanal&year=${weekYear}&week=${week}`;
                isPeriodFuture = isFuture(startOfWeek(periodDate, { weekStartsOn: 1 }));
                break;
        }

        chartPeriods.push({
            label: label,
            link: isPeriodFuture ? '#' : link,
            isFuture: isPeriodFuture
        });
    }

    return chartPeriods.reverse();
};

/**
 * Obtiene los datos detallados por categoría para el gráfico de barras.
 * @param {Array} ribbon - El array con la información de los períodos del gráfico.
 * @returns {Array} - Un array con los datos desglosados para el gráfico.
 */
const getHistoryData = async (chartRibbon) => {
    const getRangeFromRibbonItem = (item) => {
        const params = new URLSearchParams(item.link.split('?')[1]);
        const view = params.get('view');
        const year = parseInt(params.get('year'));
        let startDate, endDate;
        switch (view) {
            case 'anual':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31);
                break;
            case 'mensual':
                const month = parseInt(params.get('month')) - 1;
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0);
                break;
            case 'semanal':
                const week = parseInt(params.get('week'));
                const dateInWeek = setISOWeek(setYear(new Date(), year), week);
                startDate = startOfISOWeek(dateInWeek);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                break;
        }
        return {
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10)
        };
    };

    const promises = chartRibbon.map(async (item) => {
        if (item.isFuture) {
            return { label: item.label, details: [] };
        }
        
        const { startDate, endDate } = getRangeFromRibbonItem(item);
        const sql = `
            SELECT 
                COALESCE(cat.nombre, 'Sin Categoría') as categoria, 
                m.tipo, 
                SUM(m.monto) as total 
            FROM movimientos m 
            LEFT JOIN categorias cat ON m.categoria_id = cat.id 
            WHERE m.fecha BETWEEN ? AND ? 
            GROUP BY categoria, m.tipo
        `;
        const details = await Consultas.dbAllAsync(sql, [startDate, endDate]);
        
        return {
            label: item.label,
            details: details
        };
    });

    return Promise.all(promises);
};


/**
 * Obtiene los datos del período anterior para comparación.
 * @param {object} periodInfo - Información del período actual.
 * @returns {object} - Objeto con los totales y la etiqueta del período anterior.
 */
const getComparisonData = async (periodInfo) => {
    const { view, startDate } = periodInfo;
    let prevStartDate, prevEndDate, previousPeriodLabel;

    const start = new Date(startDate + 'T00:00:00');
    switch (view) {
        case 'anual':
            prevStartDate = subYears(start, 1);
            prevEndDate = new Date(prevStartDate.getFullYear(), 11, 31);
            previousPeriodLabel = prevStartDate.getFullYear().toString();
            break;
        case 'mensual':
            prevStartDate = subMonths(start, 1);
            prevEndDate = new Date(prevStartDate.getFullYear(), prevStartDate.getMonth() + 1, 0);
            previousPeriodLabel = prevStartDate.toLocaleString('es-AR', { month: 'short', year: '2-digit' }).replace('.', '');
            break;
        case 'semanal':
            prevStartDate = subWeeks(start, 1);
            prevEndDate = new Date(prevStartDate);
            prevEndDate.setDate(prevStartDate.getDate() + 6);
            previousPeriodLabel = `Sem ${getWeekNumber(prevStartDate)}`;
            break;
    }
    
    const prevStartDateStr = prevStartDate.toISOString().slice(0, 10);
    const prevEndDateStr = prevEndDate.toISOString().slice(0, 10);
    const sql = `SELECT tipo, SUM(monto) as total FROM movimientos WHERE fecha BETWEEN ? AND ? GROUP BY tipo`;
    const prevTotalsRows = await Consultas.dbAllAsync(sql, [prevStartDateStr, prevEndDateStr]);

    const previous = {
        ingresos: prevTotalsRows.find(r => r.tipo === 'ingreso')?.total || 0,
        egresos: prevTotalsRows.find(r => r.tipo === 'egreso')?.total || 0,
        label: previousPeriodLabel
    };
    previous.resultado = previous.ingresos - previous.egresos;
    return previous;
};


// RUTA PRINCIPAL DEL TABLERO
router.get('/', async (req, res, next) => {
    try {
        // --- MODIFICACIÓN ---
        // Se verifica si la bandera de reseteo de PIN existe en la sesión.
        const pinWasReset = req.session.pinReset || false;
        if (pinWasReset) {
            delete req.session.pinReset; // Se limpia la bandera para que no se muestre de nuevo.
        }

        const periodInfo = getPeriodInfo(req.query);
        const { startDate, endDate } = periodInfo;

        const sqlTotal = `SELECT tipo, SUM(monto) as total FROM movimientos WHERE fecha BETWEEN ? AND ? GROUP BY tipo`;
        
        const [currentTotals, previousTotals] = await Promise.all([
            Consultas.dbAllAsync(sqlTotal, [startDate, endDate]),
            getComparisonData(periodInfo),
        ]);

        const chartRibbon = getChartPeriods(periodInfo);
        const historyData = await getHistoryData(chartRibbon);
        
        const parseTotals = (rows) => ({
            ingresos: rows.find(r => r.tipo === 'ingreso')?.total || 0,
            egresos: rows.find(r => r.tipo === 'egreso')?.total || 0
        });
        const current = parseTotals(currentTotals);
        const resultado = current.ingresos - current.egresos;
        const calculateChange = (current, previous) => {
            if (previous === 0) return null;
            return ((current - previous) / Math.abs(previous)) * 100;
        };

        const comparisonData = {
            ingresos: { change: calculateChange(current.ingresos, previousTotals.ingresos) },
            gastos: { change: calculateChange(current.egresos, previousTotals.egresos) },
            resultado: { change: calculateChange(resultado, previousTotals.resultado) },
            rentabilidad: current.ingresos > 0 ? (resultado / current.ingresos) * 100 : null,
            previousPeriodLabel: previousTotals.label
        };

        const chartData = {
            history: {
                periods: historyData,
            }
        };

        res.render('inicio', {
            title: 'Tablero', 
            active_link: 'inicio',
            periodInfo,
            ingresos: { total: current.ingresos },
            gastos: { total: current.egresos },
            resultado: { total: resultado },
            chartData,
            comparisonData,
            now: new Date(),
            pinWasReset: pinWasReset // Se pasa la variable a la plantilla.
        });
    } catch (err) {
        next(err);
    }
});


// ===============================================================
// INICIO DE RUTAS API PARA GRÁFICO PERSONALIZADO
// ===============================================================

// API para buscar entidades (clientes, proveedores, categorías)
router.get('/api/search-entities', async (req, res, next) => {
    try {
        const query = (req.query.q || '').trim();
        let results = [];
        
        if (query === '' || query === '*') {
            results = await Consultas.getAllEntitiesForSearch();
        } else {
            results = await Consultas.searchEntities(query);
        }
        res.json(results);
    } catch (err) {
        next(err);
    }
});

// API para obtener datos para el gráfico personalizado
router.get('/api/custom-chart-data', async (req, res, next) => {
    try {
        const periodInfo = getPeriodInfo(req.query);
        let chartRibbon = getChartPeriods(periodInfo);
        chartRibbon = chartRibbon.slice(-7);

        const selectedEntities = JSON.parse(req.query.entities || '[]');
        if (selectedEntities.length === 0) {
            return res.json({ labels: [], totals: [] });
        }

        const dataPromises = chartRibbon.map(item => {
            if (item.isFuture) {
                return Promise.resolve({ label: item.label, total: 0 });
            }
            const params = new URLSearchParams(item.link.split('?')[1]);
            const queryObj = Object.fromEntries(params.entries());
            const { startDate, endDate } = getPeriodInfo(queryObj);
            return Consultas.getTotalsForEntities(startDate, endDate, selectedEntities);
        });

        const results = await Promise.all(dataPromises);

        res.json({
            labels: chartRibbon.map(item => item.label),
            totals: results.map(r => Math.abs(r.total || 0))
        });

    } catch (err) {
        next(err);
    }
});
// ===============================================================
// FIN DE RUTAS API
// ===============================================================

// ===============================================================
// INICIO DE NUEVA RUTA API PARA RANKING
// ===============================================================
router.get('/api/ranking-data', async (req, res, next) => {
    try {
        const periodInfo = getPeriodInfo(req.query);
        const { startDate, endDate } = periodInfo;
        const type = req.query.type || 'clientes';

        let sql, params;

        switch (type) {
            case 'clientes':
                sql = `SELECT c.nombre as name, SUM(ABS(m.monto)) as total 
                       FROM movimientos m 
                       JOIN clientes c ON m.entidad_id = c.id 
                       WHERE m.entidad_tipo = 'cliente' AND m.tipo = 'ingreso' AND m.fecha BETWEEN ? AND ? 
                       GROUP BY m.entidad_id, c.nombre 
                       ORDER BY total DESC`;
                params = [startDate, endDate];
                break;
            case 'proveedores':
                sql = `SELECT p.nombre as name, SUM(ABS(m.monto)) as total 
                       FROM movimientos m 
                       JOIN proveedores p ON m.entidad_id = p.id 
                       WHERE m.entidad_tipo = 'proveedor' AND m.tipo = 'egreso' AND m.fecha BETWEEN ? AND ? 
                       GROUP BY m.entidad_id, p.nombre 
                       ORDER BY total DESC`;
                params = [startDate, endDate];
                break;
            case 'ingresos':
                sql = `SELECT c.nombre as name, SUM(ABS(m.monto)) as total 
                       FROM movimientos m 
                       JOIN categorias c ON m.categoria_id = c.id 
                       WHERE m.tipo = 'ingreso' AND m.fecha BETWEEN ? AND ? 
                       GROUP BY m.categoria_id, c.nombre 
                       ORDER BY total DESC`;
                params = [startDate, endDate];
                break;
            case 'egresos':
                sql = `SELECT c.nombre as name, SUM(ABS(m.monto)) as total 
                       FROM movimientos m 
                       JOIN categorias c ON m.categoria_id = c.id 
                       WHERE m.tipo = 'egreso' AND m.fecha BETWEEN ? AND ? 
                       GROUP BY m.categoria_id, c.nombre 
                       ORDER BY total DESC`;
                params = [startDate, endDate];
                break;
            default:
                return res.status(400).json({ error: 'Invalid ranking type' });
        }
        
        const results = await Consultas.dbAllAsync(sql, params);

        if (!results || results.length === 0) {
            return res.json({ top: [], rest: { total: 0, percentage: 0 }, grandTotal: 0 });
        }

        const grandTotal = results.reduce((sum, item) => sum + item.total, 0);

        const top5 = results.slice(0, 5).map(item => ({
            name: item.name,
            total: item.total,
            percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
        }));

        const restTotal = results.slice(5).reduce((sum, item) => sum + item.total, 0);
        
        const rest = {
            total: restTotal,
            percentage: grandTotal > 0 ? (restTotal / grandTotal) * 100 : 0
        };

        res.json({ top: top5, rest, grandTotal });

    } catch (err) {
        next(err);
    }
});
// ===============================================================
// FIN DE NUEVA RUTA API PARA RANKING
// ===============================================================

module.exports = router;
