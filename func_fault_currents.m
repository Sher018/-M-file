function F = func_fault_currents(Z1, Z2, Z0, E, U_nom, Rf_pu)
    % FUNC_FAULT_CURRENTS Расчёт токов всех видов КЗ методом симметричных составляющих.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.4.0
    % Подраздел диплома: 3.3–3.4 «Симметричные составляющие и токи КЗ»
    %
    % Учитывает переходное сопротивление Rf (о.е.) и коэффициент напряжения c
    % (через E). Возвращает структуру F с полями (кА):
    %   Ik3  — трёхфазное КЗ;
    %   Ik2  — двухфазное КЗ (с множителем √3);
    %   Ik1  — однофазное КЗ на землю;
    %   Ik11 — двухфазное КЗ на землю (наибольший фазный ток);
    %   Ig   — ток в земле при двухфазном КЗ на землю (3·I0).
    %
    % Формулы (E — фазная ЭДС/коэффициент c в о.е.):
    %   Ik3  = c / (Z1 + Zf)
    %   Ik2  = √3·c / (Z1 + Z2 + 2·Zf)
    %   Ik1  = 3·c / (Z1 + Z2 + Z0 + 3·Zf)

    if nargin < 6 || isempty(Rf_pu)
        Rf_pu = 0;
    end
    Zf = Rf_pu;

    I1_3 = E / (Z1 + Zf);
    I2_2 = sqrt(3) * E / (Z1 + Z2 + 2 * Zf);
    I0_1 = E / (Z1 + Z2 + Z0 + 3 * Zf);

    F.Ik3 = func_pu_to_ka(I1_3, U_nom);
    F.Ik2 = func_pu_to_ka(I2_2, U_nom);
    F.Ik1 = func_pu_to_ka(3 * I0_1, U_nom);

    [Ik11_pu, Ig_pu] = llg_currents(E, Z1, Z2, Z0, Zf);
    F.Ik11 = func_pu_to_ka(Ik11_pu, U_nom);
    F.Ig = func_pu_to_ka(Ig_pu, U_nom);
end

function [Imax_phase, I_ground] = llg_currents(E, Z1, Z2, Z0, Zf)
    % Двухфазное КЗ на землю (фазы B, C на землю). Сопротивление Zf — в путь земли (Z0).
    Z0e = Z0 + 3 * Zf;
    denom = Z2 + Z0e;
    if denom == 0
        Imax_phase = 0;
        I_ground = 0;
        return;
    end
    Zpar = (Z2 * Z0e) / denom;
    I1 = E / (Z1 + Zpar);
    I2 = -I1 * Z0e / denom;
    I0 = -I1 * Z2 / denom;

    a = exp(2j * pi / 3);
    Ib = I0 + a^2 * I1 + a * I2;
    Ic = I0 + a * I1 + a^2 * I2;

    Imax_phase = max(abs(Ib), abs(Ic));
    I_ground = abs(3 * I0);
end
