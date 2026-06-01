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
        'i_ud', {}, 'k_ud', {}, 'tau_s', {}, 'Z1_abs', {});

    fprintf('\n%-14s %8s %8s %8s %8s %8s %8s %10s\n', ...
        'Точка', 'Uном,кВ', 'Ik3,кА', 'Ik2,кА', 'Ik1,кА', 'iуд,кА', 'k_уд', 'tau,с');
    fprintf('%s\n', repmat('-', 1, 82));

    for k = 1:numel(points)
        p = points(k);
        [I1, I2, I0] = func_sym_components(p.E, p.Z1, p.Z2, p.Z0);
        [Ik3, Ik2, Ik1] = func_sc_currents(I1, I2, I0, p.U_nom);
        Z1_ohm = p.Z1 * p.scInfo.Z_base;
        [i_ud, k_ud] = func_impact_current(Ik3, real(Z1_ohm), imag(Z1_ohm));
        [tau_s, ~, ~] = func_network_tau(p.Z1, p.scInfo.Z_base, omega);

        r.name = p.name;
        r.U_nom = p.U_nom;
        r.Ik3 = Ik3; r.Ik2 = Ik2; r.Ik1 = Ik1;
        r.i_ud = i_ud; r.k_ud = k_ud; r.tau_s = tau_s;
        r.Z1_abs = abs(p.Z1);
        results(k) = r; %#ok<AGROW>

        fprintf('%-14s %8.1f %8.2f %8.2f %8.2f %8.2f %8.4f %10.6f\n', ...
            p.name, p.U_nom, Ik3, Ik2, Ik1, i_ud, k_ud, tau_s);
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
