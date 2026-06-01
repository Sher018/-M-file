function outPath = func_export_points(results, filename)
    % FUNC_EXPORT_POINTS Экспорт таблицы сравнения точек КЗ в CSV (+ TSV в Octave).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.6 «Главный сценарий и интеграция модулей»

    if nargin < 2 || isempty(filename)
        filename = 'results/results_points.csv';
    end

    d = fileparts(filename);
    if ~isempty(d) && ~exist(d, 'dir')
        mkdir(d);
    end

    sep = ',';
    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        [p, b, ~] = fileparts(filename);
        if isempty(p)
            p = '.';
        end
        filename = fullfile(p, [b '.tsv']);
        sep = sprintf('\t');
    end

    fid = fopen(filename, 'w');
    if fid < 0
        error('func_export_points: не удалось открыть файл %s.', filename);
    end
    cols = {'Point', 'U_nom_kV', 'Ik3_kA', 'Ik2_kA', 'Ik1_kA', 'i_ud_kA', 'k_ud', 'tau_s', 'Z1_abs_pu'};
    fprintf(fid, '%s\n', strjoin(cols, sep));
    for k = 1:numel(results)
        r = results(k);
        fields = {r.name, num2str(r.U_nom, '%.4f'), num2str(r.Ik3, '%.6f'), ...
            num2str(r.Ik2, '%.6f'), num2str(r.Ik1, '%.6f'), num2str(r.i_ud, '%.6f'), ...
            num2str(r.k_ud, '%.6f'), num2str(r.tau_s, '%.6f'), num2str(r.Z1_abs, '%.6f')};
        fprintf(fid, '%s\n', strjoin(fields, sep));
    end
    fclose(fid);

    fprintf('  Таблица сравнения сохранена: %s\n', filename);
    outPath = filename;
end
