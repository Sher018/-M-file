function meta = func_pack_results_meta(scInfo, Z1, Z2, Z0, k_ud, tau_s, f_hz)
    % FUNC_PACK_RESULTS_META Сборка структуры метаданных для отчёта и экспорта.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»

    meta = struct();
    meta.version = sc_version();
    meta.inputFile = scInfo.inputFile;
    meta.Z1 = Z1;
    meta.Z2 = Z2;
    meta.Z0 = Z0;
    meta.k_ud = k_ud;
    meta.tau_s = tau_s;
    meta.f_hz = f_hz;
    meta.Z_base_ohm = scInfo.Z_base;
    Zohm = Z1 * scInfo.Z_base;
    meta.R_sum_ohm = real(Zohm);
    meta.X_sum_ohm = imag(Zohm);
    meta.z2_from_excel = scInfo.z2_from_excel;
end
