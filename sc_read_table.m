function [headers, rows] = sc_read_table(filename)
    % SC_READ_TABLE Кроссплатформенное чтение таблицы параметров (XLSX/XLS/CSV/TXT).
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных»
    %
    % [headers, rows] = sc_read_table(filename)
    %   headers — 1×N cell строк-заголовков (обрезаны пробелы);
    %   rows    — M×N cell ячеек с данными (число или текст).
    %
    % Поддержаны MATLAB и GNU Octave. Для .csv/.txt разделитель (',' или ';')
    % определяется автоматически.

    if ~exist(filename, 'file')
        error(['sc_read_table: файл не найден:\n  %s\n', ...
               'Подсказка: создайте шаблон командой  make_template  и заполните его.'], filename);
    end

    [~, ~, ext] = fileparts(filename);
    ext = lower(ext);
    isOct = exist('OCTAVE_VERSION', 'builtin') ~= 0;

    if any(strcmp(ext, {'.csv', '.txt'}))
        [headers, rows] = read_delimited(filename);
    elseif isOct
        try
            pkg('load', 'io');
        catch
        end
        [~, ~, raw] = xlsread(filename);
        if isempty(raw) || size(raw, 1) < 2
            error('sc_read_table: файл %s пуст или содержит только заголовок.', filename);
        end
        headers = normalize_headers(raw(1, :));
        rows = raw(2:end, :);
    else
        opts = detectImportOptions(filename);
        T = readtable(filename, opts);
        headers = T.Properties.VariableNames;
        rows = table2cell(T);
    end

    if isempty(headers) || isempty(rows)
        error('sc_read_table: не удалось прочитать данные из %s.', filename);
    end
end

function [headers, rows] = read_delimited(filename)
    fid = fopen(filename, 'r');
    if fid < 0
        error('sc_read_table: не удалось открыть файл %s.', filename);
    end
    lines = {};
    while true
        ln = fgetl(fid);
        if ~ischar(ln)
            break;
        end
        if ~isempty(strtrim(ln))
            lines{end + 1} = ln; %#ok<AGROW>
        end
    end
    fclose(fid);

    if numel(lines) < 2
        error('sc_read_table: файл %s пуст или содержит только заголовок.', filename);
    end

    delim = ',';
    if sum(lines{1} == ';') > sum(lines{1} == ',')
        delim = ';';
    end

    headers = split_line(lines{1}, delim);
    nCol = numel(headers);
    rows = cell(numel(lines) - 1, nCol);
    for r = 2:numel(lines)
        parts = split_line(lines{r}, delim);
        for c = 1:nCol
            if c <= numel(parts)
                token = strtrim(parts{c});
                num = str2double(strrep(token, ',', '.'));
                if ~isnan(num) && ~isempty(token)
                    rows{r - 1, c} = num;
                else
                    rows{r - 1, c} = token;
                end
            else
                rows{r - 1, c} = '';
            end
        end
    end
end

function parts = split_line(ln, delim)
    parts = strsplit(ln, delim, 'CollapseDelimiters', false);
    for k = 1:numel(parts)
        parts{k} = strtrim(parts{k});
    end
end

function h = normalize_headers(rawHeader)
    h = cell(1, numel(rawHeader));
    for k = 1:numel(rawHeader)
        v = rawHeader{k};
        if ischar(v)
            h{k} = strtrim(v);
        elseif isnumeric(v) && isscalar(v) && isfinite(v)
            h{k} = strtrim(num2str(v));
        else
            h{k} = '';
        end
    end
end
