function [i_ud, k_ud] = func_impact_current(Ik3, varargin)
    % FUNC_IMPACT_CURRENT Расчёт ударного тока i_уд = k_уд · Ik3 · √2 (кА).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.5 «Модуль расчёта ударного тока func_impact_current.m»
    %
    % func_impact_current(Ik3)                 — k_уд = 1.8 (типовое значение);
    % func_impact_current(Ik3, k_scalar)       — явный коэффициент 1…2;
    % func_impact_current(Ik3, R_ohm, X_ohm) — k_уд по отношению R/X
    %   (аппроксимация κ = 1.02 + 0.98·exp(−3·R/X), ограничение 1…1.8).

    if nargin == 1
        k_ud = 1.8;
    elseif nargin == 2
        v = varargin{1};
        if isempty(v)
            k_ud = 1.8;
        elseif isnumeric(v) && isscalar(v)
            k_ud = min(2.0, max(1.0, v));
        else
            error('func_impact_current: второй аргумент должен быть скаляром k_уд или парой (R_ohm, X_ohm).');
        end
    elseif nargin >= 3
        R = varargin{1};
        X = varargin{2};
        k_ud = k_ud_from_rx(R, X);
    else
        k_ud = 1.8;
    end

    i_ud = k_ud * Ik3 * sqrt(2);
end

function k = k_ud_from_rx(R, X)
    if ~(isfinite(R) && isfinite(X))
        k = 1.8;
        return;
    end
    R = max(R, 0);
    if X <= 1e-15
        k = 1.8;
        return;
    end
    rx = R / X;
    k = 1.02 + 0.98 * exp(-3 * rx);
    k = min(1.8, max(1.0, k));
end
