// ==================================================
// PROYECTO: Calculadora de Líneas de Transmisión
// MATERIA: Centrales Hidroeléctricas
// AUTOR: Brayan Paco — Estudiante Universitario
// ==================================================

// Constantes físicas
const mu0 = 4 * Math.PI * 1e-7;  // Permeabilidad del vacío (H/m)
const e0 = 8.854e-12;            // Permitividad del vacío (F/m)

// Cambiar vista de campos según tipo de línea
document.querySelectorAll('input[name="tipoLinea"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.body.classList.toggle('tipo-mono', document.getElementById('tipoMonofasico').checked);
    });
});

function calcularTodo() {
    // === LEER DATOS DE ENTRADA ===
    const esTrifasico = document.getElementById('tipoTrifasico').checked;
    const radio_mm = parseFloat(document.getElementById('radio_mm').value);
    const L_km = parseFloat(document.getElementById('L_km').value);
    const f = parseFloat(document.getElementById('f').value);
    const U_L_kV = parseFloat(document.getElementById('U_L_kV').value);
    const R_por_km = parseFloat(document.getElementById('R_por_km').value);
    const P_r_MW = parseFloat(document.getElementById('P_r_MW').value);
    const FP_r = parseFloat(document.getElementById('FP_r').value);

    // Distancias según tipo de línea
    let GMD;
    if (esTrifasico) {
        const D12 = parseFloat(document.getElementById('D12').value);
        const D23 = parseFloat(document.getElementById('D23').value);
        const D13 = parseFloat(document.getElementById('D13').value);
        GMD = Math.cbrt(D12 * D23 * D13); // Distancia media geométrica trifásica (m)
    } else {
        const D_mono = parseFloat(document.getElementById('D_mono').value);
        GMD = D_mono; // Distancia entre conductores monofásica (m)
    }

    // Conversiones base
    const U_L = U_L_kV * 1000;           // Tensión de línea en voltios
    const U_fase_r = esTrifasico ? U_L / Math.sqrt(3) : U_L / 2; // Tensión de fase/recepción
    const omega = 2 * Math.PI * f;       // Velocidad angular
    const r_m = radio_mm / 1000;         // Radio en metros
    const r_prime = 0.7788 * r_m;        // Radio medio geométrico del conductor

    // ==============================================
    // 1. RESISTENCIA
    // ==============================================
    const R_km = R_por_km;
    const R_total = R_km * L_km;

    // ==============================================
    // 2. INDUCTANCIA Y REACTANCIA INDUCTIVA
    // ==============================================
    const factor_L = esTrifasico ? 1 : 2; // monofásico: 2 conductores en serie
    const L_por_m = (mu0 / (2 * Math.PI)) * Math.log(GMD / r_prime) * factor_L;
    const L_por_km = L_por_m * 1000;               // H/km
    const L_por_km_mH = L_por_km * 1000;           // mH/km
    const L_total = L_por_km * L_km;               // H

    const X_L_por_km = omega * L_por_km;           // Ω/km
    const X_L_total = X_L_por_km * L_km;           // Ω

    // ==============================================
    // 3. CAPACITANCIA, SUSCEPTANCIA Y REACTANCIA CAPACITIVA
    // ==============================================
    const factor_C = esTrifasico ? 1 : 0.5;
    const C_por_m = (2 * Math.PI * e0) / Math.log(GMD / r_m) * factor_C;
    const C_por_km = C_por_m * 1000;               // F/km
    const C_por_km_nF = C_por_km * 1e9;            // nF/km
    const C_total = C_por_km * L_km;               // F
    const C_total_uF = C_total * 1e6;              // µF

    const B_por_km = omega * C_por_km;             // S/km
    const B_total = B_por_km * L_km;               // S
    const X_C_por_km = B_por_km > 0 ? 1 / B_por_km : Infinity; // Ω/km
    const X_C_total = B_total > 0 ? 1 / B_total : Infinity;   // Ω

    // ==============================================
    // 4. IMPEDANCIA SERIE Z
    // ==============================================
    const Z_re = R_total;
    const Z_im = X_L_total;
    const Z_mod = Math.hypot(Z_re, Z_im);
    const Z_ang = Math.atan2(Z_im, Z_re) * 180 / Math.PI;

    // ==============================================
    // 5. ADMITANCIA Y MODELO π
    // ==============================================
    const Y_medio_im = B_total / 2;

    // ==============================================
    // 6. CORRIENTE Y POTENCIAS EN RECEPCIÓN
    // ==============================================
    const P_r = P_r_MW * 1e6;                      // W
    const S_r = P_r / FP_r;                        // VA
    const phi_r = Math.acos(FP_r);
    const Q_r = S_r * Math.sin(phi_r);             // VAR (inductivo +)
    const I_r_mod = S_r / (esTrifasico ? 3 * U_fase_r : U_fase_r * 2); // A
    const I_r_re = I_r_mod * FP_r;
    const I_r_im = -I_r_mod * Math.sin(phi_r);     // Inductivo → componente negativa

    // ==============================================
    // 7. CORRIENTE DE CARGA Y CAÍDA DE TENSIÓN
    // ==============================================
    const I_c_r_im = Y_medio_im * U_fase_r;
    const I_linea_re = I_r_re;
    const I_linea_im = I_r_im + I_c_r_im;

    // Caída de tensión ΔU = I_linea × Z
    const dV_re = I_linea_re * Z_re - I_linea_im * Z_im;
    const dV_im = I_linea_re * Z_im + I_linea_im * Z_re;

    // Tensión en envío
    const U_fase_s_re = U_fase_r + dV_re;
    const U_fase_s_im = dV_im;
    const U_fase_s_mod = Math.hypot(U_fase_s_re, U_fase_s_im);
    const U_fase_s_ang = Math.atan2(U_fase_s_im, U_fase_s_re) * 180 / Math.PI;
    const U_L_s = esTrifasico ? U_fase_s_mod * Math.sqrt(3) : U_fase_s_mod * 2;

    // Corriente en envío
    const I_c_s_im = Y_medio_im * U_fase_s_mod;
    const I_s_re = I_linea_re;
    const I_s_im = I_linea_im + I_c_s_im;
    const I_s_mod = Math.hypot(I_s_re, I_s_im);
    const I_s_ang = Math.atan2(I_s_im, I_s_re) * 180 / Math.PI;

    // ==============================================
    // 8. POTENCIAS EN ENVÍO
    // ==============================================
    const factor_pot = esTrifasico ? 3 : 1;
    const P_s = factor_pot * (U_fase_s_re * I_s_re + U_fase_s_im * I_s_im);
    const Q_s = factor_pot * (U_fase_s_im * I_s_re - U_fase_s_re * I_s_im);
    const S_s = Math.hypot(P_s, Q_s);
    const FP_s = S_s > 0 ? P_s / S_s : 0;

    // ==============================================
    // 9. PÉRDIDAS, EFICIENCIA Y REGULACIÓN
    // ==============================================
    const perdidas_P = P_s - P_r;
    const perdidas_Q = Q_s - Q_r;
    const eficiencia = P_s > 0 ? (P_r / P_s) * 100 : 0;
    const regulacion = ((U_fase_s_mod - U_fase_r) / U_fase_r) * 100;

    // ==============================================
    // 10. EFECTO FERRANTI (línea sin carga)
    // ==============================================
    const I_linea_vacia_im = Y_medio_im * U_fase_r;
    const dV_vacia_re = -I_linea_vacia_im * Z_im;
    const dV_vacia_im = I_linea_vacia_im * Z_re;
    const U_fase_s_ferranti = Math.hypot(U_fase_r + dV_vacia_re, dV_vacia_im);
    const aumento_ferranti = ((U_fase_s_ferranti - U_fase_r) / U_fase_r) * 100;

    // ==============================================
    // MOSTRAR RESULTADOS
    // ==============================================
    document.getElementById('resultados').classList.remove('oculto');
    const tipoTexto = esTrifasico ? 'Trifásica' : 'Monofásica';

    document.getElementById('sec_param_km').innerHTML = `
        <p><strong>Resistencia por km:</strong> ${R_km.toFixed(4)} Ω/km | Total: ${R_total.toFixed(2)} Ω</p>
        <p><strong>Radio medio geométrico r':</strong> ${(r_prime*1000).toFixed(3)} mm</p>
        <p><strong>Distancia media geométrica GMD:</strong> ${GMD.toFixed(3)} m</p>
        <p><strong>Inductancia por km:</strong> ${L_por_km_mH.toFixed(4)} mH/km | Total: ${L_total.toFixed(4)} H</p>
        <p><strong>Reactancia inductiva X<sub>L</sub>:</strong> ${X_L_por_km.toFixed(4)} Ω/km | Total: ${X_L_total.toFixed(2)} Ω</p>
        <p><strong>Capacitancia por km:</strong> ${C_por_km_nF.toFixed(4)} nF/km | Total: ${C_total_uF.toFixed(4)} µF</p>
        <p><strong>Susceptancia B:</strong> ${B_por_km.toFixed(6)} S/km | Total: ${B_total.toFixed(4)} S</p>
        <p><strong>Reactancia capacitiva X<sub>C</sub>:</strong> ${X_C_por_km.toFixed(1)} Ω/km | Total: ${X_C_total.toFixed(0)} Ω</p>
    `;

    document.getElementById('sec_param_total').innerHTML = `
        <p>Resistencia total R = ${R_total.toFixed(2)} Ω</p>
        <p>Inductancia total L = ${L_total.toFixed(4)} H</p>
        <p>Reactancia inductiva total X<sub>L</sub> = ${X_L_total.toFixed(2)} Ω</p>
        <p>Capacitancia total C = ${C_total_uF.toFixed(4)} µF</p>
        <p>Susceptancia total B = ${B_total.toFixed(4)} S</p>
    `;

    document.getElementById('sec_Z').innerHTML = `
        <p><strong>Forma rectangular:</strong> Z = ${Z_re.toFixed(2)} + j${Z_im.toFixed(2)} Ω</p>
        <p><strong>Forma polar:</strong> |Z| = ${Z_mod.toFixed(2)} Ω ∠ ${Z_ang.toFixed(2)}°</p>
    `;

    document.getElementById('sec_Y').innerHTML = `
        <p>Susceptancia total B = ${B_total.toFixed(4)} S</p>
        <p>Mitad de susceptancia (modelo π): B/2 = ${(B_total/2).toFixed(4)} S</p>
        <p>Admitancia total Y = j${B_total.toFixed(4)} S</p>
    `;

    document.getElementById('sec_pi').innerHTML = `
        <p>Impedancia serie: Z = ${Z_re.toFixed(2)} + j${Z_im.toFixed(2)} Ω</p>
        <p>Ramal shunt recepción: Y/2 = j${(B_total/2).toFixed(4)} S</p>
        <p>Ramal shunt envío: Y/2 = j${(B_total/2).toFixed(4)} S</p>
    `;

    document.getElementById('sec_recepcion').innerHTML = `
        <p>Tensión de fase U<sub>r</sub> = ${(U_fase_r/1000).toFixed(3)} kV | Tensión de línea U<sub>Lr</sub> = ${(U_L/1000).toFixed(2)} kV</p>
        <p>Corriente de recepción I<sub>r</sub> = ${I_r_mod.toFixed(1)} A ∠ ${(-phi_r*180/Math.PI).toFixed(2)}°</p>
        <p>Potencia activa P<sub>r</sub> = ${(P_r/1e6).toFixed(2)} MW</p>
        <p>Potencia reactiva Q<sub>r</sub> = ${(Q_r/1e6).toFixed(3)} MVAr (inductiva)</p>
        <p>Potencia aparente S<sub>r</sub> = ${(S_r/1e6).toFixed(2)} MVA</p>
        <p>Factor de potencia FP<sub>r</sub> = ${FP_r.toFixed(2)} (inductivo)</p>
    `;

    document.getElementById('sec_envio').innerHTML = `
        <p>Corriente por mitad de susceptancia (recepción): Ic_r = ${Math.hypot(0,I_c_r_im).toFixed(2)} A</p>
        <p>Corriente que circula por la línea: I_linea = ${Math.hypot(I_linea_re,I_linea_im).toFixed(1)} A</p>
        <p>Caída de tensión en la línea: ΔU = ${Math.hypot(dV_re,dV_im).toFixed(0)} V</p>
        <p>Tensión de fase en envío U<sub>s</sub> = ${(U_fase_s_mod/1000).toFixed(3)} kV ∠ ${U_fase_s_ang.toFixed(2)}°</p>
        <p>Tensión de línea en envío U<sub>Ls</sub> = ${(U_L_s/1000).toFixed(2)} kV</p>
        <p>Corriente de envío I<sub>s</sub> = ${I_s_mod.toFixed(1)} A ∠ ${I_s_ang.toFixed(2)}°</p>
        <p>Potencia activa P<sub>s</sub> = ${(P_s/1e6).toFixed(2)} MW</p>
        <p>Potencia reactiva Q<sub>s</sub> = ${(Q_s/1e6).toFixed(3)} MVAr</p>
        <p>Potencia aparente S<sub>s</sub> = ${(S_s/1e6).toFixed(2)} MVA</p>
        <p>Factor de potencia envío FP<sub>s</sub> = ${FP_s.toFixed(3)}</p>
    `;

    document.getElementById('sec_ferranti').innerHTML = `
        <p>Tensión de fase en recepción: ${(U_fase_r/1000).toFixed(3)} kV</p>
        <p>Tensión de fase en envío (línea vacía - Efecto Ferranti): <span class="resaltado">${(U_fase_s_ferranti/1000).toFixed(3)} kV</span></p>
        <p>Aumento de tensión: ${aumento_ferranti.toFixed(2)}%</p>
        <p>La tensión sube en el extremo de envío cuando la línea está sin carga.</p>
    `;

    document.getElementById('sec_resumen').innerHTML = `
        <table>
            <tr><th>Magnitud</th><th>Recepción</th><th>Envío</th></tr>
            <tr><td>Tensión de línea (kV)</td><td>${(U_L/1000).toFixed(2)}</td><td>${(U_L_s/1000).toFixed(2)}</td></tr>
            <tr><td>Corriente (A)</td><td>${I_r_mod.toFixed(1)}</td><td>${I_s_mod.toFixed(1)}</td></tr>
            <tr><td>Potencia Activa (MW)</td><td>${(P_r/1e6).toFixed(2)}</td><td>${(P_s/1e6).toFixed(2)}</td></tr>
            <tr><td>Potencia Reactiva (MVAr)</td><td>${(Q_r/1e6).toFixed(3)}</td><td>${(Q_s/1e6).toFixed(3)}</td></tr>
            <tr><td>Potencia Aparente (MVA)</td><td>${(S_r/1e6).toFixed(2)}</td><td>${(S_s/1e6).toFixed(2)}</td></tr>
            <tr><td>Factor de Potencia</td><td>${FP_r.toFixed(2)}</td><td>${FP_s.toFixed(3)}</td></tr>
        </table>
        <p><strong>Pérdidas de potencia activa:</strong> ${(perdidas_P/1e6).toFixed(2)} MW</p>
        <p><strong>Pérdidas de potencia reactiva:</strong> ${(perdidas_Q/1e6).toFixed(3)} MVAr</p>
        <p><strong>Eficiencia:</strong> ${eficiencia.toFixed(2)}%</p>
        <p><strong>Regulación de tensión:</strong> ${regulacion.toFixed(2)}%</p>
        <p><strong>Efecto Ferranti — Aumento:</strong> ${aumento_ferranti.toFixed(2)}%</p>
        <p style="margin-top:15px; padding:10px; background:#e3f2fd; border-radius:6px;">
            <strong>Proyecto:</strong> Línea de Transmisión ${tipoTexto} | 
            <strong>Materia:</strong> Centrales Hidroeléctricas | 
            <strong>Autor:</strong> Brayan Paco
        </p>
    `;
}