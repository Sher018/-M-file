function oct_sc_menu()
    % OCT_SC_MENU Интерактивный запуск расчёта в GNU Octave (без MATLAB uifigure).
    % Переходит в папку проекта, загружает io, запрашивает параметры и выполняет расчёт.

    if exist('OCTAVE_VERSION', 'builtin') == 0
        disp('Подсказка: oct_sc_menu ориентирован на GNU Octave; в MATLAB удобнее main_calc_sc или sc_calculator_gui.');
    end

    rootDir = fileparts(mfilename('fullpath'));
    cd(rootDir);
    addpath(rootDir);

    sc_octave_init();

    defXlsx = 'network_parameters.xlsx';
    s = input(sprintf('Файл Excel [%s]: ', defXlsx), 's');
    if isempty(strtrim(s))
        xPath = fullfile(rootDir, defXlsx);
    else
        xPath = strtrim(s);
        if ~isabsolute_oct(xPath)
            xPath = fullfile(rootDir, xPath);
        end
    end
    if ~exist(xPath, 'file')
        error('oct_sc_menu: файл не найден: %s', xPath);
    end

    f_hz = input_num_oct('Частота f, Гц', 50, 1, 400);
    T_sim = input_num_oct('Интервал осциллограммы T, с', 0.2, 0.01, 2);
    alpha_deg = input_num_oct('Угол коммутации psi, град', 0, -360, 360);
    three_phase = input_yn_oct('Три фазы на графике', true);

    disp('--- Расчёт ---');
    [Z1, Z2, Z0, E, U_nom, scInfo] = func_import_data(xPath);
    F = func_fault_currents(Z1, Z2, Z0, E, U_nom, scInfo.Rf_pu);
    Ik3 = F.Ik3; Ik2 = F.Ik2; Ik1 = F.Ik1;

    Z1_ohm = Z1 * scInfo.Z_base;
    R_tot = real(Z1_ohm);
    X_tot = imag(Z1_ohm);
    [i_ud, k_ud] = func_impact_current(Ik3, R_tot, X_tot);

    omega = 2 * pi * f_hz;
    [tau_s, ~, ~] = func_network_tau(Z1, scInfo.Z_base, omega);
    BT = func_breaking_thermal(Ik3, tau_s, T_sim);
    extra = struct('Ik11', F.Ik11, 'Ig', F.Ig, 'i_ud', i_ud, ...
        'Ib', BT.Ib, 'Ib_asym', BT.Ib_asym, 'I_th', BT.I_th, ...
        't_break', BT.t_break, 'i_dc', BT.i_dc);
    meta = func_pack_results_meta(scInfo, Z1, Z2, Z0, k_ud, tau_s, f_hz, extra);
    func_oscillogram(Ik3, f_hz, T_sim, tau_s, alpha_deg, three_phase);

    xlsxOut = fullfile(rootDir, 'results', 'results_sc.xlsx');
    txtOut = fullfile(rootDir, 'results', 'docs', 'report_sc.txt');
    docOut = fullfile(rootDir, 'results', 'docs', 'report_sc.doc');
    outTab = func_export_results(U_nom, Ik3, Ik2, Ik1, i_ud, xlsxOut, meta);
    func_report(U_nom, Ik3, Ik2, Ik1, i_ud, txtOut, meta);

    single = struct('U_nom', U_nom, 'Ik3', Ik3, 'Ik2', Ik2, 'Ik1', Ik1, ...
        'i_ud', i_ud, 'meta', meta);
    func_report_word(single, docOut);

    fprintf('\nГотово. Версия %s\n', sc_version());
    fprintf('Iк3 = %.4f кА, Iк2 = %.4f кА, Iк1 = %.4f кА\n', Ik3, Ik2, Ik1);
    fprintf('Iк1.1 = %.4f кА (земля %.4f кА), iуд = %.4f кА, k_уд = %.4f\n', F.Ik11, F.Ig, i_ud, k_ud);
    fprintf('Iоткл = %.4f кА (асимм. %.4f), Iтер = %.4f кА, tau = %.6f с\n', BT.Ib, BT.Ib_asym, BT.I_th, tau_s);
    fprintf('График: %s\n', fullfile(rootDir, 'results', 'figures', 'oscillogram.png'));
    fprintf('Таблица: %s\n', outTab);
    fprintf('Отчёт (txt): %s\n', txtOut);
    fprintf('Отчёт (Word): %s\n', docOut);
end

function v = input_num_oct(prompt, default_val, lo, hi)
    s = input(sprintf('%s [%.4g]: ', prompt, default_val), 's');
    if isempty(strtrim(s))
        v = default_val;
        return;
    end
    v = str2double(strrep(strtrim(s), ',', '.'));
    if isnan(v)
        v = default_val;
    end
    v = min(hi, max(lo, v));
end

function tf = input_yn_oct(prompt, default_tf)
    defch = 'y';
    if ~default_tf
        defch = 'n';
    end
    s = input(sprintf('%s (y/n) [%s]: ', prompt, defch), 's');
    s = lower(strtrim(s));
    if isempty(s)
        tf = default_tf;
        return;
    end
    tf = ismember(s(1), {'y', 'д', '1'});
end

function tf = isabsolute_oct(p)
    if isempty(p)
        tf = false;
        return;
    end
    if ispc
        tf = (length(p) >= 2 && p(2) == ':') || (p(1) == '\' || p(1) == '/');
    else
        tf = p(1) == '/';
    end
end
