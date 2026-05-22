function [tau_s, R_ohm, X_ohm] = func_network_tau(Z1_pu, Z_base_ohm, omega_rad_s)
    % FUNC_NETWORK_TAU Постоянная времени апериодической составляющей τ ≈ X/(ωR).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % Z1_pu — суммарное сопротивление прямой последовательности, о.е.;
    % Z_base_ohm — базисное сопротивление (Uном²/100 при Sбаз = 100 МВА).

    Z_ohm = Z1_pu * Z_base_ohm;
    R_ohm = real(Z_ohm);
    X_ohm = imag(Z_ohm);
    R_eff = max(R_ohm, 0);
    X_eff = max(X_ohm, 1e-12);
    w = max(omega_rad_s, 1e-6);
    tau_s = X_eff / (w * max(R_eff, 1e-9));
    tau_s = min(max(tau_s, 5e-5), 2.0);
end
