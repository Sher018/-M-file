function [nPass, nFail, nSkip] = verify_sc_suite(verbose, stopOnError, writeReport)
    % VERIFY_SC_SUITE Верификация и модульное тестирование комплекса SC_Calculator.
    %
    % [nPass, nFail, nSkip] = verify_sc_suite()
    % [nPass, nFail, nSkip] = verify_sc_suite(verbose, stopOnError, writeReport)
    %
    % verbose      — вывод в командное окно (по умолчанию true).
    % stopOnError  — останов на первой ошибке (по умолчанию false).
    % writeReport  — запись results/docs/verification_report.txt (по умолчанию true).
    %
    % Запуск из корня проекта:
    %   addpath('tests'); verify_sc_suite
    % или:
    %   run_sc_tests   % вызывает полный набор verify_sc_suite

    if nargin < 1 || isempty(verbose)
        verbose = true;
    end
    if nargin < 2 || isempty(stopOnError)
        stopOnError = false;
    end
    if nargin < 3 || isempty(writeReport)
        writeReport = true;
    end

    thisDir = fileparts(mfilename('fullpath'));
    projRoot = fileparts(thisDir);
    addpath(projRoot);
    addpath(thisDir);

    names = {
        'Ударный ток: k_уд по умолчанию (1 аргумент)'
        'Ударный ток: явный скаляр k_уд'
        'Ударный ток: R=0, X>0 → k_уд = 1.8'
        'Ударный ток: X≈0 → k_уд = 1.8'
        'Ударный ток: R/X=0.1 → формула IEC-аппроксимации'
        'Ударный ток: большой R/X → k близко к нижнему плато формулы'
        'Постоянная tau: согласование с Z_ом и omega'
        'Постоянная tau: ограничение сверху (2 с)'
        'Постоянная tau: ограничение снизу (5e-5 с)'
        'Симметричные составляющие: сравнение с формулами (√3 в Iк2)'
        'Токи КЗ: Ik3, Ik2, Ik1 при Uном=10 кВ'
        'func_fault_currents: формулы и соотношение Iк2≈0.866·Iк3'
        'func_fault_currents: учёт Rf снижает токи'
        'Двухфазное КЗ на землю: положительные конечные токи'
        'Ток отключения и термический ток: формулы'
        'Последовательно-параллельное объединение ветвей'
        'func_pack_results_meta: обязательные поля'
        'Экспорт: запись TSV/таблицы во временный каталог'
        'Интеграция: network_parameters.xlsx (при наличии)'
    };

    fns = {
        @test_impact_default
        @test_impact_scalar
        @test_impact_rx_zeroR
        @test_impact_rx_zeroX
        @test_impact_rx_mid
        @test_impact_rx_large
        @test_tau_consistency
        @test_tau_cap_max
        @test_tau_cap_min
        @test_sym_components_formulas
        @test_sc_currents_three_types
        @test_fault_currents_formulas
        @test_fault_currents_rf
        @test_llg_currents
        @test_breaking_thermal
        @test_series_parallel
        @test_pack_meta
        @test_export_temp
        @test_integration_xlsx
    };

    n = numel(fns);
    nPass = 0;
    nFail = 0;
    nSkip = 0;
    lines = cell(0, 1);
    t0 = tic;

    for k = 1:n
        nm = names{k};
        try
            feval(fns{k});
            nPass = nPass + 1;
            lines{end + 1, 1} = sprintf('PASS  %s', nm); %#ok<AGROW>
            if verbose
                fprintf('[PASS]  %s\n', nm);
            end
        catch ME
            if is_skip_message(ME)
                nSkip = nSkip + 1;
                lines{end + 1, 1} = sprintf('SKIP  %s — %s', nm, ME.message); %#ok<AGROW>
                if verbose
                    fprintf('[SKIP]  %s — %s\n', nm, ME.message);
                end
            else
                nFail = nFail + 1;
                lines{end + 1, 1} = sprintf('FAIL  %s — %s', nm, ME.message); %#ok<AGROW>
                if verbose
                    fprintf('[FAIL]  %s\n  %s\n', nm, ME.message);
                end
                if stopOnError
                    rethrow(ME);
                end
            end
        end
    end

    elapsed = toc(t0);
    summary = sprintf('Итого: PASS=%d  FAIL=%d  SKIP=%d  время=%.3f с  версия=%s', ...
        nPass, nFail, nSkip, elapsed, sc_version());
    lines{end + 1, 1} = summary;

    if verbose
        fprintf('\n%s\n', summary);
    end

    if writeReport
        write_verification_report(projRoot, lines, nPass, nFail, nSkip, elapsed);
    end

    if nFail > 0 && nargout == 0
        error('verify_sc_suite: провалено тестов: %d (PASS=%d SKIP=%d)', nFail, nPass, nSkip);
    end
end

function tf = is_skip_message(ME)
    msg = ME.message;
    if isempty(msg) && isa(ME, 'MException')
        try
            msg = getReport(ME, 'basic');
        catch
            msg = '';
        end
    end
    tf = ~isempty(strfind(msg, 'VERIFY_SKIP')); %#ok<STREMP>
end

function write_verification_report(projRoot, lines, nPass, nFail, nSkip, elapsed)
    repDir = fullfile(projRoot, 'results', 'docs');
    if ~exist(repDir, 'dir')
        mkdir(repDir);
    end
    repPath = fullfile(repDir, 'verification_report.txt');
    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        fid = fopen(repPath, 'w');
    else
        fid = fopen(repPath, 'w', 'n', 'UTF-8');
    end
    if fid < 0
        warning('verify_sc_suite: не удалось записать %s', repPath);
        return;
    end
    fprintf(fid, 'ОТЧЁТ ВЕРИФИКАЦИИ SC_Calculator\n');
    fprintf(fid, 'Дата/время: %s\n', datestr(now, 'dd.mm.yyyy HH:MM:SS'));
    fprintf(fid, 'Версия: %s\n\n', sc_version());
    for i = 1:numel(lines)
        fprintf(fid, '%s\n', lines{i});
    end
    fprintf(fid, '\nPASS=%d  FAIL=%d  SKIP=%d  время=%.3f с\n', nPass, nFail, nSkip, elapsed);
    fclose(fid);
    fprintf('Верификация: журнал записан в %s\n', repPath);
end

%% --- Тесты (локальные функции) ---

function test_impact_default
    [i_ud, k] = func_impact_current(2.5);
    sc_assert_close(k, 1.8, 1e-12, 'k_уд');
    sc_assert_close(i_ud, 1.8 * 2.5 * sqrt(2), 1e-9, 'i_уд');
end

function test_impact_scalar
    [i_ud, k] = func_impact_current(1, 1.55);
    sc_assert_close(k, 1.55, 1e-12, 'k');
    sc_assert_close(i_ud, 1.55 * sqrt(2), 1e-9, 'i_уд');
end

function test_impact_rx_zeroR
    [~, k] = func_impact_current(1, 0, 8.5);
    sc_assert_close(k, 1.8, 1e-9, 'k при R=0');
end

function test_impact_rx_zeroX
    [~, k] = func_impact_current(1, 0.5, 0);
    sc_assert_close(k, 1.8, 1e-9, 'k при X=0');
end

function test_impact_rx_mid
    R = 0.5;
    X = 10;
    [~, k] = func_impact_current(1, R, X);
    kexp = 1.02 + 0.98 * exp(-3 * R / X);
    kexp = min(1.8, max(1.0, kexp));
    sc_assert_close(k, kexp, 1e-12, 'k');
end

function test_impact_rx_large
    R = 50;
    X = 1;
    [~, k] = func_impact_current(1, R, X);
    kexp = 1.02 + 0.98 * exp(-3 * R / X);
    kexp = min(1.8, max(1.0, kexp));
    sc_assert_close(k, kexp, 1e-12, 'k при R/X=50');
end

function test_tau_consistency
    Z1 = (0.5 + 2j) / 10;
    Zb = 10;
    w = 100 * pi;
    [tau, Rv, Xv] = func_network_tau(Z1, Zb, w);
    Zohm = Z1 * Zb;
    sc_assert_close(Rv, real(Zohm), 1e-9, 'R');
    sc_assert_close(Xv, imag(Zohm), 1e-9, 'X');
    tau_an = imag(Zohm) / (w * max(real(Zohm), 1e-9));
    tau_an = min(max(tau_an, 5e-5), 2.0);
    sc_assert_close(tau, tau_an, 1e-12, 'tau');
end

function test_tau_cap_max
    Z1 = 1e-6 + 100j;
    Zb = 1;
    w = 2 * pi * 50;
    [tau, ~, ~] = func_network_tau(Z1, Zb, w);
    sc_assert_close(tau, 2.0, 1e-9, 'tau cap 2');
end

function test_tau_cap_min
    Z1 = 10 + 1e-6j;
    Zb = 0.01;
    w = 2 * pi * 50;
    [tau, ~, ~] = func_network_tau(Z1, Zb, w);
    sc_assert_close(tau, 5e-5, 1e-9, 'tau floor');
end

function test_sym_components_formulas
    E = 1.05;
    Z1 = 0.12 + 0.35j;
    Z2 = 0.10 + 0.28j;
    Z0 = 0.08 + 0.40j;
    [I1, I2, I0] = func_sym_components(E, Z1, Z2, Z0);
    sc_assert_close_c(I1, E / Z1, 1e-12, 'I1');
    sc_assert_close_c(I2, sqrt(3) * E / (Z1 + Z2), 1e-12, 'I2 (с √3)');
    sc_assert_close_c(I0, E / (Z1 + Z2 + Z0), 1e-12, 'I0');
end

function test_fault_currents_formulas
    E = 1.1;
    Z1 = 0.08 + 0.42j;
    Z2 = Z1;
    Z0 = 0.15 + 0.55j;
    U = 10;
    F = func_fault_currents(Z1, Z2, Z0, E, U, 0);
    kA = (U * 1000 / sqrt(3)) / 100;
    sc_assert_close(F.Ik3, abs(E / Z1) * kA, 1e-9, 'Ik3');
    sc_assert_close(F.Ik2, abs(sqrt(3) * E / (Z1 + Z2)) * kA, 1e-9, 'Ik2');
    sc_assert_close(F.Ik1, abs(3 * E / (Z1 + Z2 + Z0)) * kA, 1e-9, 'Ik1');
    % При Z2=Z1: Ik2 = (√3/2)·Ik3 ≈ 0.866·Ik3
    sc_assert_close(F.Ik2 / F.Ik3, sqrt(3) / 2, 1e-9, 'Ik2/Ik3');
end

function test_fault_currents_rf
    E = 1.1; Z1 = 0.08 + 0.42j; Z2 = Z1; Z0 = 0.15 + 0.55j; U = 10;
    F0 = func_fault_currents(Z1, Z2, Z0, E, U, 0);
    F1 = func_fault_currents(Z1, Z2, Z0, E, U, 0.2);
    if ~(F1.Ik3 < F0.Ik3)
        error('VERIFY_FAIL: Rf должно снижать ток трёхфазного КЗ');
    end
end

function test_llg_currents
    E = 1.1; Z1 = 0.08 + 0.42j; Z2 = Z1; Z0 = 0.15 + 0.55j; U = 10;
    F = func_fault_currents(Z1, Z2, Z0, E, U, 0);
    if ~(isfinite(F.Ik11) && F.Ik11 > 0 && isfinite(F.Ig) && F.Ig > 0)
        error('VERIFY_FAIL: ожидались положительные конечные токи двухфазного КЗ на землю');
    end
end

function test_breaking_thermal
    Ik = 5.0; tau = 0.05; t = 0.2;
    B = func_breaking_thermal(Ik, tau, t);
    sc_assert_close(B.Ib, Ik, 1e-12, 'Ib');
    i_dc = sqrt(2) * Ik * exp(-t / tau);
    sc_assert_close(B.i_dc, i_dc, 1e-9, 'i_dc');
    sc_assert_close(B.Ib_asym, sqrt(Ik^2 + i_dc^2), 1e-9, 'Ib_asym');
    m = (tau / t) * (1 - exp(-2 * t / tau));
    sc_assert_close(B.I_th, Ik * sqrt(m + 1), 1e-9, 'I_th');
    if ~(B.I_th >= Ik && B.Ib_asym >= Ik)
        error('VERIFY_FAIL: Iтер и Iоткл.асимм должны быть не меньше I"k');
    end
end

function test_series_parallel
    % Две одинаковые параллельные ветви по 0+10j → 0+5j; плюс последовательная 1+0j
    Z = [10j; 10j; 1];
    lab = {'A'; 'A'; ''};
    Zt = sc_series_parallel(Z, lab);
    sc_assert_close_c(Zt, 1 + 5j, 1e-9, 'series-parallel');
    % Без меток — чистая сумма
    Zs = sc_series_parallel(Z, {});
    sc_assert_close_c(Zs, 1 + 20j, 1e-9, 'series sum');
end

function test_sc_currents_three_types
    E = 1.05;
    Z1 = 0.08 + 0.42j;
    Z2 = Z1;
    Z0 = 0.15 + 0.55j;
    U = 10;
    [I1, I2, I0] = func_sym_components(E, Z1, Z2, Z0);
    [Ik3, Ik2, Ik1] = func_sc_currents(I1, I2, I0, U);
    kA = (U * 1000 / sqrt(3)) / 100;
    sc_assert_close(Ik3, abs(I1) * kA, 1e-9, 'Ik3');
    sc_assert_close(Ik2, abs(I2) * kA, 1e-9, 'Ik2');
    sc_assert_close(Ik1, abs(3 * I0) * kA, 1e-9, 'Ik1');
end

function test_pack_meta
    scI = struct('Z_base', 1, 'inputFile', 'demo.xlsx', 'z2_from_excel', true);
    Z1 = 0.1 + 0.2j;
    Z2 = 0.15j;
    Z0 = 0.2;
    meta = func_pack_results_meta(scI, Z1, Z2, Z0, 1.72, 0.03, 50);
    assert(isfield(meta, 'version'));
    assert(isfield(meta, 'k_ud'));
    sc_assert_close(meta.k_ud, 1.72, 1e-12, 'meta.k_ud');
    sc_assert_close(meta.tau_s, 0.03, 1e-12, 'meta.tau_s');
    sc_assert_close(meta.f_hz, 50, 1e-12, 'meta.f_hz');
end

function test_export_temp
    d = tempname;
    mkdir(d);
    cln = onCleanup(@() rmdir(d, 's'));
    meta = struct();
    outf = fullfile(d, 'out.tsv');
    func_export_results(10, 7.1, 3.5, 7.7, 18, outf, meta);
    fid = fopen(outf, 'r');
    if fid < 0
        error('VERIFY_FAIL: не удалось прочитать экспорт');
    end
    ln = fgetl(fid);
    fclose(fid);
    t = char(ln);
    if numel(t) < 10
        error('VERIFY_FAIL: пустой или короткий экспорт');
    end
end

function test_integration_xlsx
    thisDir = fileparts(mfilename('fullpath'));
    projRoot = fileparts(thisDir);
    xlsx = fullfile(projRoot, 'network_parameters.xlsx');
    if exist(xlsx, 'file') ~= 2
        error('VERIFY_SKIP: файл network_parameters.xlsx не найден в корне проекта');
    end
    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        try
            pkg('load', 'io');
        catch
            error('VERIFY_SKIP: пакет io не загружен — интеграционный тест Excel пропущен');
        end
    end
    try
        [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(xlsx);
    catch readErr
        if exist('OCTAVE_VERSION', 'builtin') ~= 0
            error('VERIFY_SKIP: чтение xlsx недоступно в среде Octave (нет распаковщика) — тест пропущен');
        end
        rethrow(readErr);
    end
    if ~(isfinite(real(Z1)) && isfinite(imag(Z1)) && U_nom > 0)
        error('VERIFY_FAIL: импорт дал некорректные данные');
    end
    [I1, I2, I0] = func_sym_components(E, Z1, Z2, Z0);
    [Ik3, Ik2, Ik1] = func_sc_currents(I1, I2, I0, U_nom);
    if ~(Ik3 > 0 && Ik2 > 0 && Ik1 > 0)
        error('VERIFY_FAIL: ожидались положительные токи КЗ');
    end
    Zohm = Z1 * scInfo.Z_base;
    [i_ud, k_ud] = func_impact_current(Ik3, real(Zohm), imag(Zohm));
    if ~(i_ud > Ik3 && k_ud >= 1 && k_ud <= 1.8)
        error('VERIFY_FAIL: ударный ток вне ожидаемого диапазона');
    end
end
