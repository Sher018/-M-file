function results = run_points(excelFile, f_hz)
    % RUN_POINTS Расчёт токов КЗ для нескольких точек с таблицей сравнения.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.6 «Главный сценарий и интеграция модулей»
    %
    % run_points                              — network_parameters.xlsx, f = 50 Гц
    % run_points('my_net.csv')                — заданный файл
    % run_points('my_net.csv', 60)            — заданная частота
    %
    % Точки задаются столбцом Point в таблице (см. make_template). Результат —
    % структурный массив и файлы results/results_points.csv (+ .tsv) и отчёт RTF.

    if nargin < 1 || isempty(excelFile)
        excelFile = 'network_parameters.xlsx';
    end
    if nargin < 2 || isempty(f_hz)
        f_hz = 50;
    end

    rootDir = fileparts(mfilename('fullpath'));
    addpath(rootDir);
    sc_ensure_results_dirs(rootDir);
    if ~sc_is_absolute(excelFile)
        cand = fullfile(rootDir, excelFile);
        if exist(cand, 'file')
            excelFile = cand;
        end
    end

    disp('=====================================================');
    disp('  SC_Calculator — расчёт по нескольким точкам КЗ');
    disp(['  Версия ', sc_version()]);
    disp('=====================================================');

    points = func_import_points(excelFile);
    omega = 2 * pi * f_hz;

    results = struct('name', {}, 'U_nom', {}, 'Ik3', {}, 'Ik2', {}, 'Ik1', {}, ...
        'Ik11', {}, 'i_ud', {}, 'k_ud', {}, 'I_th', {}, 'tau_s', {}, 'Z1_abs', {});

    fprintf('\n%-12s %7s %7s %7s %7s %8s %7s %7s %9s\n', ...
        'Точка', 'Uн,кВ', 'Ik3', 'Ik2', 'Ik1', 'Ik1.1', 'iуд', 'Iтер', 'tau,с');
    fprintf('%s\n', repmat('-', 1, 82));

    for k = 1:numel(points)
        p = points(k);
        F = func_fault_currents(p.Z1, p.Z2, p.Z0, p.E, p.U_nom, p.scInfo.Rf_pu);
        Z1_ohm = p.Z1 * p.scInfo.Z_base;
        [i_ud, k_ud] = func_impact_current(F.Ik3, real(Z1_ohm), imag(Z1_ohm));
        [tau_s, ~, ~] = func_network_tau(p.Z1, p.scInfo.Z_base, omega);
        BT = func_breaking_thermal(F.Ik3, tau_s, 0.2);

        r.name = p.name;
        r.U_nom = p.U_nom;
        r.Ik3 = F.Ik3; r.Ik2 = F.Ik2; r.Ik1 = F.Ik1; r.Ik11 = F.Ik11;
        r.i_ud = i_ud; r.k_ud = k_ud; r.I_th = BT.I_th;
        r.tau_s = tau_s; r.Z1_abs = abs(p.Z1);
        results(k) = r; %#ok<AGROW>

        fprintf('%-12s %7.1f %7.2f %7.2f %7.2f %8.2f %7.2f %7.2f %9.6f\n', ...
            p.name, p.U_nom, F.Ik3, F.Ik2, F.Ik1, F.Ik11, i_ud, BT.I_th, tau_s);
    end
    fprintf('%s\n', repmat('-', 1, 82));

    [~, fn, ext] = fileparts(excelFile);
    inputFile = [fn ext];
    csvPath = func_export_points(results, fullfile(rootDir, 'results', 'results_points.csv'));
    docPath = func_report_word([], fullfile(rootDir, 'results', 'docs', 'report_points.doc'), ...
        results, inputFile, f_hz);

    fprintf('\nГотово. Таблица сравнения: %s\n', csvPath);
    fprintf('Отчёт (откроется в Word): %s\n', docPath);
    disp('=====================================================');
end
