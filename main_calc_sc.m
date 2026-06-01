function main_calc_sc(excelFile)
    % MAIN_CALC_SC Главный сценарий автоматизированного расчёта токов короткого замыкания.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % main_calc_sc
    % main_calc_sc('network_parameters.xlsx')
    % main_calc_sc('C:\data\my_network.xlsx')
    %
    % Последовательность: импорт Excel → симметричные составляющие → токи КЗ →
    % ударный ток → постоянная времени → осциллограмма → экспорт и отчёт.

    if nargin < 1 || isempty(excelFile)
        excelFile = 'network_parameters.xlsx';
    end

    clearvars -except excelFile;
    clc;
    close all;

    rootDir = fileparts(mfilename('fullpath'));
    if ~isempty(rootDir)
        addpath(rootDir);
    end
    sc_ensure_results_dirs(rootDir);
    oldPwd = pwd;
    cd(rootDir);
    c = onCleanup(@() cd(oldPwd));

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        more off;
        try
            pkg('load', 'io');
        catch
            warning(['Octave: пакет io не загружен — чтение Excel может не работать. ', ...
                'Выполните: pkg install -forge io; pkg load io']);
        end
    end

    f_hz = 50;
    T_sim = 0.2;
    alpha_deg = 0;
    three_phase = true;

    print_banner();

    tStart = tic;
    fprintf('\n[1/7] Импорт параметров сети из файла «%s»...\n', excelFile);
    [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(excelFile);

    fprintf('[2/7] Расчёт токов КЗ всех видов (симметричные составляющие)...\n');
    F = func_fault_currents(Z1, Z2, Z0, E, U_nom, scInfo.Rf_pu);
    Ik3 = F.Ik3; Ik2 = F.Ik2; Ik1 = F.Ik1;

    fprintf('[3/7] Ударный ток (k_уд по суммарному R/X цепи Z1)...\n');
    Z1_ohm = Z1 * scInfo.Z_base;
    R_tot = real(Z1_ohm);
    X_tot = imag(Z1_ohm);
    [i_ud, k_ud] = func_impact_current(Ik3, R_tot, X_tot);

    fprintf('[4/7] Постоянная времени, ток отключения и термический ток...\n');
    omega = 2 * pi * f_hz;
    [tau_s, ~, ~] = func_network_tau(Z1, scInfo.Z_base, omega);
    BT = func_breaking_thermal(Ik3, tau_s, T_sim);

    extra = struct('Ik11', F.Ik11, 'Ig', F.Ig, 'i_ud', i_ud, ...
        'Ib', BT.Ib, 'Ib_asym', BT.Ib_asym, 'I_th', BT.I_th, ...
        't_break', BT.t_break, 'i_dc', BT.i_dc);
    meta = func_pack_results_meta(scInfo, Z1, Z2, Z0, k_ud, tau_s, f_hz, extra);

    fprintf('[5/7] Построение осциллограммы...\n');
    func_oscillogram(Ik3, f_hz, T_sim, tau_s, alpha_deg, three_phase);

    fprintf('[6/7] Формирование сводки результатов...\n');
    print_results_table(U_nom, F, i_ud, k_ud, tau_s, Z1, R_tot, X_tot, scInfo, BT);

    fprintf('[7/7] Экспорт таблицы, текстового и Word-отчёта...\n');
    func_export_results(U_nom, Ik3, Ik2, Ik1, i_ud, 'results/results_sc.xlsx', meta);
    func_report(U_nom, Ik3, Ik2, Ik1, i_ud, 'results/docs/report_sc.txt', meta);

    single = struct('U_nom', U_nom, 'Ik3', Ik3, 'Ik2', Ik2, 'Ik1', Ik1, ...
        'i_ud', i_ud, 'meta', meta);
    func_report_word(single, 'results/docs/report_sc.doc');

    elapsed = toc(tStart);
    fprintf('\nРасчёт завершён за %.2f с.\n', elapsed);
    disp('  Осциллограмма : results/figures/');
    disp('  Таблица       : results/results_sc.xlsx (или .tsv в Octave)');
    disp('  Отчёт (txt)   : results/docs/report_sc.txt');
    disp('  Отчёт (Word)  : results/docs/report_sc.doc');
    disp('=====================================================');
end

function print_banner()
    disp('=====================================================');
    disp('  SC_Calculator — расчёт токов короткого замыкания');
    disp('  Комплекс M-file сценариев, ИРНИТУ, 2026 г.');
    disp(['  Версия ', sc_version()]);
    disp('=====================================================');
end

function print_results_table(U_nom, F, i_ud, k_ud, tau_s, Z1, R_tot, X_tot, scInfo, BT)
    fprintf('\n--- РЕЗУЛЬТАТЫ РАСЧЁТА (Uном = %.1f кВ, c = %.2f', U_nom, scInfo.c);
    if scInfo.Rf_ohm ~= 0
        fprintf(', Rf = %.3f Ом', scInfo.Rf_ohm);
    end
    fprintf(') ---\n');
    fprintf('  Трёхфазное КЗ (Iк3)        : %8.2f кА\n', F.Ik3);
    fprintf('  Двухфазное КЗ (Iк2)        : %8.2f кА\n', F.Ik2);
    fprintf('  Однофазное КЗ (Iк1)        : %8.2f кА\n', F.Ik1);
    fprintf('  Двухфазное КЗ на землю     : %8.2f кА  (ток в земле %.2f кА)\n', F.Ik11, F.Ig);
    fprintf('  Ударный ток iуд            : %8.2f кА  (k_уд = %.4f)\n', i_ud, k_ud);
    fprintf('  Ток отключения Iоткл       : %8.2f кА  (асимметр. %.2f кА)\n', BT.Ib, BT.Ib_asym);
    fprintf('  Термический ток Iтер (%.2fс): %8.2f кА\n', BT.t_break, BT.I_th);
    fprintf('  Постоянная τ               : %8.6f с\n', tau_s);
    fprintf('  |Z1|                       : %8.4f о.е.  (R_Σ = %.4f Ом, X_Σ = %.4f Ом)\n', abs(Z1), R_tot, X_tot);
    fprintf('-----------------------------------------------------\n');
end
