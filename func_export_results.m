function outPath = func_export_results(U_nom, Ik3, Ik2, Ik1, i_ud, filename, meta)
    % FUNC_EXPORT_RESULTS Экспорт итогов расчёта токов КЗ в Excel или TSV (Octave).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % meta (опционально) — структура из func_pack_results_meta.

    if nargin < 6 || isempty(filename)
        filename = 'results/results_sc.xlsx';
    end
    if nargin < 7
        meta = struct();
    end

    rootDir = fileparts(mfilename('fullpath'));
    sc_ensure_results_dirs(rootDir);

    d = fileparts(filename);
    if ~isempty(d) && ~exist(d, 'dir')
        mkdir(d);
    end

    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        [p, b, e] = fileparts(filename);
        if isempty(p)
            p = '.';
        end
        if isempty(e) || strcmpi(e, '.xlsx') || strcmpi(e, '.xls') || strcmpi(e, '.csv')
            filename = fullfile(p, [b '.tsv']);
        end
        fid = fopen(filename, 'w');
        if fid < 0
            error('func_export_results: не удалось открыть файл %s', filename);
        end
        try
            if isempty(fieldnames(meta))
                fprintf(fid, 'U_nom_kV\tIk3_kA\tIk2_kA\tIk1_kA\ti_ud_kA\n');
                fprintf(fid, '%.6f\t%.6f\t%.6f\t%.6f\t%.6f\n', U_nom, Ik3, Ik2, Ik1, i_ud);
            else
                fprintf(fid, ['version\tinputFile\tU_nom_kV\tIk3_kA\tIk2_kA\tIk1_kA\ti_ud_kA\t' ...
                    'k_ud\ttau_s\tf_Hz\tZ1_abs_pu\tZ1_deg_deg\tZ2_abs_pu\tZ2_deg_deg\t' ...
                    'Z0_abs_pu\tZ0_deg_deg\tR_sum_ohm\tX_sum_ohm\tZ2_from_excel\n']);
                fprintf(fid, '%s\t%s\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\t%d\n', ...
                    char(meta.version), char(meta.inputFile), U_nom, Ik3, Ik2, Ik1, i_ud, ...
                    meta.k_ud, meta.tau_s, meta.f_hz, ...
                    abs(meta.Z1), angle_deg(meta.Z1), abs(meta.Z2), angle_deg(meta.Z2), ...
                    abs(meta.Z0), angle_deg(meta.Z0), meta.R_sum_ohm, meta.X_sum_ohm, ...
                    double(meta.z2_from_excel));
            end
        catch err
            fclose(fid);
            rethrow(err);
        end
        fclose(fid);
    else
        if isempty(fieldnames(meta))
            T = table(U_nom, Ik3, Ik2, Ik1, i_ud, ...
                'VariableNames', {'U_nom_kV', 'Ik3_kA', 'Ik2_kA', 'Ik1_kA', 'i_ud_kA'});
        else
            verc = {char(meta.version)};
            inpf = {char(meta.inputFile)};
            T = table(verc, inpf, U_nom, Ik3, Ik2, Ik1, i_ud, meta.k_ud, meta.tau_s, meta.f_hz, ...
                abs(meta.Z1), angle_deg(meta.Z1), abs(meta.Z2), angle_deg(meta.Z2), ...
                abs(meta.Z0), angle_deg(meta.Z0), meta.R_sum_ohm, meta.X_sum_ohm, ...
                meta.z2_from_excel, ...
                'VariableNames', {'version', 'inputFile', 'U_nom_kV', 'Ik3_kA', 'Ik2_kA', ...
                'Ik1_kA', 'i_ud_kA', 'k_ud', 'tau_s', 'f_Hz', 'Z1_abs_pu', 'Z1_deg_deg', ...
                'Z2_abs_pu', 'Z2_deg_deg', 'Z0_abs_pu', 'Z0_deg_deg', 'R_sum_ohm', ...
                'X_sum_ohm', 'Z2_from_excel'});
        end
        writetable(T, filename, 'Sheet', 1);
    end

    fprintf('  Результаты экспортированы: %s\n', filename);
    outPath = filename;
end

function d = angle_deg(z)
    d = angle(z) * (180 / pi);
end
